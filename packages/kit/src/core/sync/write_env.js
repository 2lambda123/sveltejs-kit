import path from 'path';
import { get_env } from '../../vite/utils.js';
import { write_if_changed, reserved, valid_identifier } from './utils.js';

const autogen_comment = '// this file is generated — do not edit it\n';

/**
 * Writes the existing environment variables in process.env to
 * $env/static/private and $env/static/public
 * @param {import('types').ValidatedKitConfig} config
 * @param {string} mode
 * The Vite mode.
 */
export function write_env(config, mode) {
	const env = get_env(mode, config.env.publicPrefix);

	// TODO when testing src, `$app` points at `src/runtime/app`... will
	// probably need to fiddle with aliases
	write_if_changed(
		path.join(config.outDir, 'runtime/env/static/public.js'),
		create_module('$env/static/public', env.public)
	);

	write_if_changed(
		path.join(config.outDir, 'runtime/env/static/private.js'),
		create_module('$env/static/private', env.private)
	);

	write_if_changed(
		path.join(config.outDir, 'ambient.d.ts'),
		autogen_comment +
			create_types('$env/static/public', env.public) +
			'\n\n' +
			create_types('$env/static/private', env.private)
	);
}

/**
 * @param {string} id
 * @param {Record<string, string>} env
 * @returns {string}
 */
function create_module(id, env) {
	const declarations = Object.entries(env)
		.filter(([k]) => valid_identifier.test(k))
		.map(([k, v]) => {
			const comment = `/** @type {import('${id}'}').${k}} */`;

			if (reserved.has(k)) {
				let i = 1;
				while (k + i in env) i++;
				const name = k + 1;

				return `${comment}\nconst ${name} = ${JSON.stringify(v)}; export { ${name} as ${k} }`;
			}

			return `${comment}\nexport const ${k} = ${JSON.stringify(v)};`;
		})
		.join('\n\n');

	return autogen_comment + declarations;
}

/**
 * @param {string} id
 * @param {Record<string, string>} env
 * @returns {string}
 */
function create_types(id, env) {
	const declarations = Object.keys(env)
		.filter((k) => valid_identifier.test(k))
		.map((k) => `\texport const ${k}: string;`)
		.join('\n');

	return `declare module '${id}' {\n${declarations}\n}`;
}
