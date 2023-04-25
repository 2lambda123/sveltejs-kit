import { Server } from 'SERVER';
import { manifest, prerendered } from 'MANIFEST';
import * as Cache from 'worktop/cfw.cache';

const server = new Server(manifest);

/** @type {import('worktop/cfw').Module.Worker<{ ASSETS: import('worktop/cfw.durable').Durable.Object }>} */
const worker = {
	async fetch(req, env, context) {
		// @ts-ignore
		await server.init({ env });
		// skip cache if "cache-control: no-cache" in request
		let pragma = req.headers.get('cache-control') || '';
		let res = !pragma.includes('no-cache') && (await Cache.lookup(req));
		if (res) return res;

		let { pathname } = new URL(req.url);
		try {
			pathname = decodeURIComponent(pathname);
		} catch {
			// ignore invalid URI
		}

		const stripped_pathname = pathname.replace(/\/$/, '');

		// prerendered pages and /static files
		let is_static_asset = false;
		const filename = stripped_pathname.substring(1);
		if (filename) {
			is_static_asset =
				manifest.assets.has(filename) || manifest.assets.has(filename + '/index.html');
		}

		const location = pathname.at(-1) === '/' ? stripped_pathname : pathname + '/';

		if (is_static_asset || prerendered.has(pathname)) {
			res = await env.ASSETS.fetch(req);
		} else if (location && prerendered.has(location)) {
			res = new Response('', {
				status: 308,
				headers: {
					location
				}
			});
		} else {
			// dynamically-generated pages
			res = await server.respond(req, {
				// @ts-ignore
				platform: { env, context, caches },
				getClientAddress() {
					return req.headers.get('cf-connecting-ip');
				}
			});
		}

		// write to Cache only if allowed & specified
		pragma = res.headers.get('cache-control');

		// only save good responses to Cache
		return should_cache(res) ? Cache.save(req, res, context) : res;
	}
};

/**
 * @param {Response} res
 * @returns {boolean}
 */
function should_cache(res) {
	const cacheControl = res.headers.get('cache-control');
	return cacheControl && res.ok && !is_error(res.status);
}

/**
 * @param {number} status
 * @returns {boolean}
 */
function is_error(status) {
	return status > 399;
}

export default worker;
