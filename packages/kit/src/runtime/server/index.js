import { respond } from './respond.js';
import { set_paths } from '../paths.js';
import { set_building, set_version } from '../env.js';
import { set_private_env } from '../env-private.js';
import { set_public_env } from '../env-public.js';
import {
	paths,
	version,
	options,
	public_prefix,
	get_hooks
} from '__GENERATED__/server-internal.js';

let read = null;

set_paths(paths);
set_version(version);

// allow paths to be globally overridden
// in svelte-kit preview and in prerendering
export function override(settings) {
	set_paths(settings.paths);
	set_building(settings.building);
	read = settings.read;
}

export class Server {
	/** @param {import('types').SSRManifest} manifest */
	constructor(manifest) {
		/** @type {import('types').SSROptions} */
		this.options = { manifest, ...options };
	}

	/**
	 * @param {{
	 *   env: Record<string, string>
	 * }} opts
	 */
	async init({ env }) {
		// Take care: Some adapters may have to call \`Server.init\` per-request to set env vars,
		// so anything that shouldn't be rerun should be wrapped in an \`if\` block to make sure it hasn't
		// been done already.
		const entries = Object.entries(env);

		const prv = Object.fromEntries(entries.filter(([k]) => !k.startsWith(public_prefix)));
		const pub = Object.fromEntries(entries.filter(([k]) => k.startsWith(public_prefix)));

		set_private_env(prv);
		set_public_env(pub);

		this.options.public_env = pub;

		if (!this.options.hooks) {
			const module = await get_hooks();

			this.options.hooks = {
				handle: module.handle || (({ event, resolve }) => resolve(event)),
				handleError:
					module.handleError ||
					(({ error }) => {
						// @ts-expect-error
						console.error(error?.stack);
					}),
				handleFetch: module.handleFetch || (({ request, fetch }) => fetch(request))
			};
		}
	}

	/**
	 * @param {Request} request
	 * @param {import('types').RequestOptions} options
	 */
	async respond(request, options = {}) {
		if (!(request instanceof Request)) {
			throw new Error(
				'The first argument to server.respond must be a Request object. See https://github.com/sveltejs/kit/pull/3384 for details'
			);
		}

		return respond(request, this.options, options);
	}
}
