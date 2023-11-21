import { DEV } from 'esm-env';
import { create_client } from './client.js';
import { init } from './singletons.js';

/**
 * @param {import('./types.js').SvelteKitApp} app
 * @param {HTMLElement} target
 * @param {boolean} fine_grained_search_params_invalidation
 * @param {Parameters<import('./types.js').Client['_hydrate']>[0]} [hydrate]
 */
export async function start(app, target, fine_grained_search_params_invalidation, hydrate) {
	// TODO remove fine_grained_search_params_invalidation after 2.0
	if (DEV && target === document.body) {
		console.warn(
			'Placing %sveltekit.body% directly inside <body> is not recommended, as your app may break for users who have certain browser extensions installed.\n\nConsider wrapping it in an element:\n\n<div style="display: contents">\n  %sveltekit.body%\n</div>'
		);
	}

	const client = create_client(app, target, fine_grained_search_params_invalidation);

	init({ client });

	if (hydrate) {
		await client._hydrate(hydrate);
	} else {
		client.goto(location.href, { replaceState: true });
	}

	client._start_router();
}
