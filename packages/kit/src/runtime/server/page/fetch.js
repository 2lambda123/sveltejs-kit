import * as cookie from 'cookie';
import * as set_cookie_parser from 'set-cookie-parser';
import { respond } from '../index.js';
import { domain_matches, path_matches } from './cookie.js';

/**
 * @param {{
 *   event: import('types').RequestEvent;
 *   options: import('types').SSROptions;
 *   state: import('types').SSRState;
 *   route: import('types').SSRRoute | import('types').SSRErrorPage;
 *   prerender_default?: import('types').PrerenderOption;
 * }} opts
 */
export function create_fetch({ event, options, state, route, prerender_default }) {
	/** @type {import('./types').Fetched[]} */
	const fetched = [];

	const initial_cookies = cookie.parse(event.request.headers.get('cookie') || '');

	/** @type {import('set-cookie-parser').Cookie[]} */
	const cookies = [];

	/** @type {typeof fetch} */
	const fetcher = async (info, init) => {
		const request = normalize_fetch_input(
			typeof info === 'string' ? new URL(info, event.url) : info,
			init
		);

		const body = init?.body;

		/** @type {import('types').PrerenderDependency} */
		let dependency;

		const response = await options.hooks.handleFetch({
			event,
			request,
			fetch: async (info, init) => {
				const request = normalize_fetch_input(info, init);

				const url = new URL(request.url);

				if (url.origin !== event.url.origin) {
					// allow cookie passthrough for "same-origin"
					// if SvelteKit is serving my.domain.com:
					// -        domain.com WILL NOT receive cookies
					// -     my.domain.com WILL receive cookies
					// -    api.domain.dom WILL NOT receive cookies
					// - sub.my.domain.com WILL receive cookies
					// ports do not affect the resolution
					// leading dot prevents mydomain.com matching domain.com
					if (
						`.${url.hostname}`.endsWith(`.${event.url.hostname}`) &&
						request.credentials !== 'omit'
					) {
						const cookie = event.request.headers.get('cookie');
						if (cookie) request.headers.set('cookie', cookie);
					}

					let response = await fetch(request);

					if (request.mode === 'no-cors') {
						response = new Response('', {
							status: response.status,
							statusText: response.statusText,
							headers: response.headers
						});
					} else {
						if (url.origin !== event.url.origin) {
							const acao = response.headers.get('access-control-allow-origin');
							if (!acao || (acao !== event.url.origin && acao !== '*')) {
								throw new Error(
									`CORS error: ${
										acao ? 'Incorrect' : 'No'
									} 'Access-Control-Allow-Origin' header is present on the requested resource`
								);
							}
						}
					}

					return response;
				}

				/** @type {Response} */
				let response;

				// handle fetch requests for static assets. e.g. prebaked data, etc.
				// we need to support everything the browser's fetch supports
				const prefix = options.paths.assets || options.paths.base;
				const filename = (
					url.pathname.startsWith(prefix) ? url.pathname.slice(prefix.length) : url.pathname
				).slice(1);
				const filename_html = `${filename}/index.html`; // path may also match path/index.html

				const is_asset = options.manifest.assets.has(filename);
				const is_asset_html = options.manifest.assets.has(filename_html);

				if (is_asset || is_asset_html) {
					const file = is_asset ? filename : filename_html;

					if (options.read) {
						const type = is_asset
							? options.manifest.mimeTypes[filename.slice(filename.lastIndexOf('.'))]
							: 'text/html';

						return new Response(options.read(file), {
							headers: type ? { 'content-type': type } : {}
						});
					}

					return await fetch(request);
				}

				if (request.credentials !== 'omit') {
					const authorization = event.request.headers.get('authorization');

					// combine cookies from the initiating request with any that were
					// added via set-cookie
					const combined_cookies = { ...initial_cookies };

					for (const cookie of cookies) {
						if (!domain_matches(event.url.hostname, cookie.domain)) continue;
						if (!path_matches(url.pathname, cookie.path)) continue;

						combined_cookies[cookie.name] = cookie.value;
					}

					const cookie = Object.entries(combined_cookies)
						.map(([name, value]) => `${name}=${value}`)
						.join('; ');

					if (cookie) {
						request.headers.set('cookie', cookie);
					}

					if (authorization && !request.headers.has('authorization')) {
						request.headers.set('authorization', authorization);
					}
				}

				if (body && typeof body !== 'string') {
					// TODO is this still necessary? we just bail out below
					// per https://developer.mozilla.org/en-US/docs/Web/API/Request/Request, this can be a
					// Blob, BufferSource, FormData, URLSearchParams, USVString, or ReadableStream object.
					// non-string bodies are irksome to deal with, but luckily aren't particularly useful
					// in this context anyway, so we take the easy route and ban them
					throw new Error('Request body must be a string');
				}

				response = await respond(request, options, {
					prerender_default,
					...state,
					initiator: route
				});

				if (state.prerendering) {
					dependency = { response, body: null };
					state.prerendering.dependencies.set(url.pathname, dependency);
				}

				return response;
			}
		});

		const set_cookie = response.headers.get('set-cookie');
		if (set_cookie) {
			cookies.push(
				...set_cookie_parser
					.splitCookiesString(set_cookie)
					.map((str) => set_cookie_parser.parseString(str))
			);
		}

		const proxy = new Proxy(response, {
			get(response, key, _receiver) {
				async function text() {
					const body = await response.text();

					// TODO just pass `response.headers`, for processing inside `serialize_data`
					/** @type {import('types').ResponseHeaders} */
					const headers = {};
					for (const [key, value] of response.headers) {
						// TODO skip others besides set-cookie and etag?
						if (key !== 'set-cookie' && key !== 'etag') {
							headers[key] = value;
						}
					}

					if (!body || typeof body === 'string') {
						const status_number = Number(response.status);
						if (isNaN(status_number)) {
							throw new Error(
								`response.status is not a number. value: "${
									response.status
								}" type: ${typeof response.status}`
							);
						}

						fetched.push({
							url: request.url.startsWith(event.url.origin)
								? request.url.slice(event.url.origin.length)
								: request.url,
							method: request.method,
							body,
							response: {
								status: status_number,
								statusText: response.statusText,
								headers,
								body
							}
						});
					}

					if (dependency) {
						dependency.body = body;
					}

					return body;
				}

				if (key === 'arrayBuffer') {
					return async () => {
						const buffer = await response.arrayBuffer();

						if (dependency) {
							dependency.body = new Uint8Array(buffer);
						}

						// TODO should buffer be inlined into the page (albeit base64'd)?
						// any conditions in which it shouldn't be?

						return buffer;
					};
				}

				if (key === 'text') {
					return text;
				}

				if (key === 'json') {
					return async () => {
						return JSON.parse(await text());
					};
				}

				// TODO arrayBuffer?

				return Reflect.get(response, key, response);
			}
		});

		return proxy;
	};

	return { fetcher, fetched, cookies };
}

/**
 * @param {RequestInfo | URL} info
 * @param {RequestInit | undefined} init
 */
function normalize_fetch_input(info, init) {
	if (info instanceof Request) {
		return info;
	}

	return new Request(info, init);
}
