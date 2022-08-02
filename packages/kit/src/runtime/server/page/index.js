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

	/** @type {Array<SSRNode | undefined>} */
	let nodes;

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
		nodes = await Promise.all(
			// we use == here rather than === because [undefined] serializes as "[null]"
			route.a.map((n) => (n == undefined ? n : options.manifest._.nodes[n]()))
		);

		// the leaf node will be present. only layouts may be undefined
		const leaf = /** @type {SSRNode} */ (nodes[nodes.length - 1]).module;

		let page_config = get_page_config(leaf, options);

		if (state.prerendering) {
			// if the page isn't marked as prerenderable (or is explicitly
			// marked NOT prerenderable, if `prerender.default` is `true`),
			// then bail out at this point
			const should_prerender = leaf.prerender ?? options.prerender.default;
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
							node,
							is_error: false,
							is_leaf: i === nodes.length - 1
						});

						if (loaded.loaded.redirect) {
							return new Response(undefined, {
								status: loaded.loaded.status,
								headers: {
									location: loaded.loaded.redirect
								}
							});
						}

						if (loaded.loaded.error) {
							error = loaded.loaded.error;
							status = loaded.loaded.status ?? 500;
						}
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
							if (route.b[i]) {
								const index = /** @type {number} */ (route.b[i]);
								const error_node = await options.manifest._.nodes[index]();

								/** @type {Loaded} */
								let node_loaded;
								let j = i;
								while (!(node_loaded = branch[j])) {
									j -= 1;
								}

								try {
									const error_loaded = /** @type {import('./types').Loaded} */ (
										await load_node({
											event,
											options,
											state,
											route,
											$session,
											node: error_node,
											is_error: true,
											is_leaf: false,
											status,
											error
										})
									);

									if (error_loaded.loaded.error) {
										continue;
									}

									page_config = get_page_config(error_node.module, options);
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
 * @param {import('types').SSRComponent} leaf
 * @param {SSROptions} options
 */
function get_page_config(leaf, options) {
	// TODO remove for 1.0
	if ('ssr' in leaf) {
		throw new Error(
			'`export const ssr` has been removed — use the handle hook instead: https://kit.svelte.dev/docs/hooks#handle'
		);
	}

	return {
		router: 'router' in leaf ? !!leaf.router : options.router,
		hydrate: 'hydrate' in leaf ? !!leaf.hydrate : options.hydrate
	};
}
