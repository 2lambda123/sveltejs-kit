import fs from 'node:fs';
import path from 'node:path';
import { resolve_entry } from '../../utils/filesystem.js';
import { s } from '../../utils/misc.js';
import { load_error_page, load_template } from '../config/index.js';
import { runtime_directory } from '../utils.js';

/**
 * @param {{
 *   hooks: string | null;
 *   config: import('types').ValidatedConfig;
 *   has_service_worker: boolean;
 *   runtime_directory: string;
 *   template: string;
 *   error_page: string;
 * }} opts
 */
const server_template = ({
	config,
	hooks,
	has_service_worker,
	runtime_directory,
	template,
	error_page
}) => `
import root from './root.svelte';
import { set_paths } from '${runtime_directory}/paths.js';
import { set_building, set_version } from '${runtime_directory}/env.js';

set_paths(${s(config.kit.paths)});
set_version(${s(config.kit.version.name)});

export const options = {
	app_template: ({ head, body, assets, nonce }) => ${s(template)
		.replace('%sveltekit.head%', '" + head + "')
		.replace('%sveltekit.body%', '" + body + "')
		.replace(/%sveltekit\.assets%/g, '" + assets + "')
		.replace(/%sveltekit\.nonce%/g, '" + nonce + "')},
	app_template_contains_nonce: ${template.includes('%sveltekit.nonce%')},
	csp: ${s(config.kit.csp)},
	csrf: {
		check_origin: ${s(config.kit.csrf.checkOrigin)},
	},
	dev: false,
	embedded: ${config.kit.embedded},
	error_template: ({ status, message }) => ${s(error_page)
		.replace(/%sveltekit\.status%/g, '" + status + "')
		.replace(/%sveltekit\.error\.message%/g, '" + message + "')},
	root,
	service_worker: ${has_service_worker}
};

export const public_prefix = '${config.kit.env.publicPrefix}';

export function get_hooks() {
	return ${hooks ? `import(${s(hooks)})` : '{}'};
}

export { set_building, set_paths };
`;

/**
 * Write server configuration to disk
 * @param {import('types').ValidatedConfig} config
 * @param {string} output
 */
export function write_server(config, output) {
	// TODO the casting shouldn't be necessary — investigate
	const hooks_file = /** @type {string} */ (resolve_entry(config.kit.files.hooks.server));

	/** @param {string} file */
	function relative(file) {
		return path.relative(output, file);
	}

	fs.writeFileSync(
		`${output}/server-internal.js`,
		server_template({
			config,
			hooks: fs.existsSync(hooks_file) ? relative(hooks_file) : null,
			has_service_worker:
				config.kit.serviceWorker.register && !!resolve_entry(config.kit.files.serviceWorker),
			runtime_directory: relative(runtime_directory),
			template: load_template(process.cwd(), config),
			error_page: load_error_page(config)
		})
	);
}
