import { copy, rimraf, mkdirp } from '../filesystem/index.js';
import { prerender } from './prerender.js';

/**
 *
 * @param {{
 *   cwd: string;
 *   config: import('types.internal').ValidatedConfig;
 *   build_data: import('types.internal').BuildData;
 *   log: import('types.internal').Logger;
 * }} opts
 * @returns {import('types').AdapterUtils}
 */
export function get_utils({ cwd, config, build_data, log }) {
	return {
		log,
		rimraf,
		mkdirp,

		/** @param {string} dest */
		copy_client_files(dest) {
			copy(`${cwd}/.svelte/output/client`, dest, (file) => file[0] !== '.');
		},

		/** @param {string} dest */
		copy_server_files(dest) {
			copy(`${cwd}/.svelte/output/server`, dest, (file) => file[0] !== '.');
		},

		/** @param {string} dest */
		copy_static_files(dest) {
			copy(config.kit.files.assets, dest);
		},

		/**
		 * @param {string} from
		 * @param {string} to
		 * @param {(basename: string) => boolean} filter
		 */
		copy(from, to, filter = () => true) {
			copy(from, to, filter);
		},

		/** @param {{ force: boolean, dest: string }} opts */
		async prerender({ force = false, dest }) {
			if (config.kit.prerender.enabled) {
				await prerender({
					out: dest,
					force,
					cwd,
					config,
					build_data: {},
					log: this.log
				});
			}
		}
	};
}
