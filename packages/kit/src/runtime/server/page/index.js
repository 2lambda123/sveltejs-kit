import { negotiate } from '../../../utils/http.js';
import { render_response } from './render.js';
import { load_node } from './load_node.js';
import { respond_with_error } from './respond_with_error.js';
import { coalesce_to_error } from '../../../utils/error.js';

/**
 * @typedef {import('./types.js').Loaded} Loaded
 * @typedef {import('types').SSRNode} SSRNode
 * @typedef {import('types').SSROptions} SSROptions
 * @typedef {import('types').SSRState} SSRState
 */

/**
 * @param {import('types').RequestEvent} event
 * @param {import('types').SSRPage} route
 * @param {import('types').SSROptions} options
 * @param {import('types').SSRState} state
 * @param {import('types').RequiredResolveOptions} resolve_opts
 * @returns {Promise<Response>}
 */
export async function render_page(event, route, options, state, resolve_opts) {
	if (state.initiator === route) {
		// infinite request cycle detected
		return new Response(`Not found: ${event.url.pathname}`, {
			status: 404
		});
	}

	const accept = negotiate(event.request.headers.get('accept') || 'text/html', [
		'text/html',
		'application/json'
	]);

	if (accept === 'application/json') {
		throw new Error('TODO return JSON');
	}

	const $session = await options.hooks.getSession(event);

	// TODO for non-GET requests, first call handler in +page.server.js

	if (!resolve_opts.ssr) {
		return await render_response({
			branch: [],
			page_config: {
				hydrate: true,
				router: true
			},
			status: 200,
			error: null,
			event,
			options,
			state,
			$session,
			resolve_opts
		});
	}

	try {
		const nodes = await Promise.all([
			// we use == here rather than === because [undefined] serializes as "[null]"
			...route.layouts.map((n) => (n == undefined ? n : options.manifest._.nodes[n]())),
			options.manifest._.nodes[route.page]()
		]);

		const leaf_node = /** @type {import('types').SSRNode} */ (nodes.at(-1));

		let page_config = get_page_config(leaf_node, options);

		if (state.prerendering) {
			// if the page isn't marked as prerenderable (or is explicitly
			// marked NOT prerenderable, if `prerender.default` is `true`),
			// then bail out at this point
			const should_prerender = leaf_node.module.prerender ?? options.prerender.default;
			if (!should_prerender) {
				return new Response(undefined, {
					status: 204
				});
			}
		}

		/** @type {Array<Loaded>} */
		let branch = [];

		/** @type {number} */
		let status = 200;

		/** @type {Error | null} */
		let error = null;

		ssr: {
			for (let i = 0; i < nodes.length; i += 1) {
				const node = nodes[i];

				/** @type {Loaded | undefined} */
				let loaded;

				if (node) {
					try {
						loaded = await load_node({
							event,
							options,
							state,
							route,
							$session,
							node
						});
					} catch (err) {
						const e = coalesce_to_error(err);

						options.handle_error(e, event);

						status = 500;
						error = e;
					}

					if (loaded && !error) {
						branch.push(loaded);
					}

					if (error) {
						while (i--) {
							if (route.errors[i]) {
								const index = /** @type {number} */ (route.errors[i]);
								const error_node = await options.manifest._.nodes[index]();

								let j = i;
								while (!branch[j]) j -= 1;

								try {
									const error_loaded = /** @type {import('./types').Loaded} */ ({
										node: error_node,
										data: {},
										server_data: {},
										fetched: []
									});

									page_config = get_page_config(error_node, options);
									branch = branch.slice(0, j + 1).concat(error_loaded);
									break ssr;
								} catch (err) {
									const e = coalesce_to_error(err);

									options.handle_error(e, event);

									continue;
								}
							}
						}

						// TODO backtrack until we find an __error.svelte component
						// that we can use as the leaf node
						// for now just return regular error page
						return await respond_with_error({
							event,
							options,
							state,
							$session,
							status,
							error,
							resolve_opts
						});
					}
				}
			}
		}

		return await render_response({
			event,
			options,
			state,
			$session,
			resolve_opts,
			page_config,
			status,
			error,
			branch: branch.filter(Boolean)
		});
	} catch (err) {
		const error = coalesce_to_error(err);

		options.handle_error(error, event);

		return await respond_with_error({
			event,
			options,
			state,
			$session,
			status: 500,
			error,
			resolve_opts
		});
	}
}

/**
 * @param {import('types').SSRNode} leaf
 * @param {SSROptions} options
 */
function get_page_config(leaf, options) {
	// TODO we can reinstate this now that it's in the module
	if (leaf.module && 'ssr' in leaf.module) {
		throw new Error(
			'`export const ssr` has been removed — use the handle hook instead: https://kit.svelte.dev/docs/hooks#handle'
		);
	}

	return {
		router: leaf.module?.router ?? options.router,
		hydrate: leaf.module?.hydrate ?? options.hydrate
	};
}
