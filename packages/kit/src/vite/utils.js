import fs from 'fs';
import path from 'path';
import { loadConfigFromFile } from 'vite';
import { get_runtime_directory } from '../core/utils.js';

/**
 * @param {import('vite').ConfigEnv} config_env
 * @return {Promise<import('vite').UserConfig>}
 */
export async function get_vite_config(config_env) {
	const config = (await loadConfigFromFile(config_env))?.config;
	if (!config) {
		throw new Error('Could not load Vite config');
	}
	return { ...config, mode: config_env.mode };
}

/**
 * @param {...import('vite').UserConfig} configs
 * @returns {import('vite').UserConfig}
 */
export function merge_vite_configs(...configs) {
	return deep_merge(
		...configs.map((config) => ({
			...config,
			resolve: {
				...config.resolve,
				alias: normalize_alias(config.resolve?.alias || {})
			}
		}))
	);
}

/**
 * Takes zero or more objects and returns a new object that has all the values
 * deeply merged together. None of the original objects will be mutated at any
 * level, and the returned object will have no references to the original
 * objects at any depth. If there's a conflict the last one wins, except for
 * arrays which will be combined.
 * @param {...Object} objects
 * @returns {Record<string, any>} the merged object
 */
export function deep_merge(...objects) {
	const result = {};
	/** @type {string[]} */
	objects.forEach((o) => merge_into(result, o));
	return result;
}

/**
 * normalize kit.vite.resolve.alias as an array
 * @param {import('vite').AliasOptions} o
 * @returns {import('vite').Alias[]}
 */
function normalize_alias(o) {
	if (Array.isArray(o)) return o;
	return Object.entries(o).map(([find, replacement]) => ({ find, replacement }));
}

/**
 * Merges b into a, recursively, mutating a.
 * @param {Record<string, any>} a
 * @param {Record<string, any>} b
 */
function merge_into(a, b) {
	/**
	 * Checks for "plain old Javascript object", typically made as an object
	 * literal. Excludes Arrays and built-in types like Buffer.
	 * @param {any} x
	 */
	const is_plain_object = (x) => typeof x === 'object' && x.constructor === Object;

	for (const prop in b) {
		if (is_plain_object(b[prop])) {
			if (!is_plain_object(a[prop])) {
				a[prop] = {};
			}
			merge_into(a[prop], b[prop]);
		} else if (Array.isArray(b[prop])) {
			if (!Array.isArray(a[prop])) {
				a[prop] = [];
			}
			a[prop].push(...b[prop]);
		} else {
			a[prop] = b[prop];
		}
	}
}

/** @param {import('types').ValidatedKitConfig} config */
export function get_aliases(config) {
	/** @type {Record<string, string>} */
	const alias = {
		__GENERATED__: path.posix.join(config.outDir, 'generated'),
		$app: `${get_runtime_directory(config)}/app`,

		// For now, we handle `$lib` specially here rather than make it a default value for
		// `config.kit.alias` since it has special meaning for packaging, etc.
		$lib: config.files.lib
	};

	for (const [key, value] of Object.entries(config.alias)) {
		alias[key] = path.resolve(value);
	}

	return alias;
}

/**
 * Given an entry point like [cwd]/src/hooks, returns a filename like [cwd]/src/hooks.js or [cwd]/src/hooks/index.js
 * @param {string} entry
 * @returns {string|null}
 */
export function resolve_entry(entry) {
	if (fs.existsSync(entry)) {
		const stats = fs.statSync(entry);
		if (stats.isDirectory()) {
			return resolve_entry(path.join(entry, 'index'));
		}

		return entry;
	} else {
		const dir = path.dirname(entry);

		if (fs.existsSync(dir)) {
			const base = path.basename(entry);
			const files = fs.readdirSync(dir);

			const found = files.find((file) => file.replace(/\.[^.]+$/, '') === base);

			if (found) return path.join(dir, found);
		}
	}

	return null;
}

/**
 * Collects plugins array from Vite raw config.
 * @param {import('types').ViteKitOptions} options
 * @param {import('vite').UserConfig} config
 * @returns {Promise<import('vite').PluginOption[]>}
 */
export async function resolve_vite_plugins_api_hooks(options, config) {
	const registeredPlugins = options.viteHooks?.pluginNames;
	if (!registeredPlugins) return [];

	// resolve plugins
	return (await flatten_vite_plugins(config)).filter(
		(p) => p && 'name' in p && registeredPlugins.includes(p.name) && p.api
	);
}

/**
 * Collects plugins array from Vite resolved config.
 * @param {import('types').ViteKitOptions} options
 * @param {import('vite').ResolvedConfig} config
 * @returns {import('vite').Plugin[]}
 */
export function lookup_vite_plugins_api_hooks(options, config) {
	const registeredPlugins = options.viteHooks?.pluginNames;
	if (!registeredPlugins) return [];

	// resolve plugins
	return config.plugins.filter(
		(p) => p && 'name' in p && registeredPlugins.includes(p.name) && p.api
	);
}

/**
 * Flatten plugins array, checking for async plugins:
 * https://github.com/vitejs/vite/blob/main/packages/vite/src/node/utils.ts#L1121
 * @param {import('vite').UserConfig} config
 * @returns {Promise<import('vite').PluginOption[]>}
 */
async function flatten_vite_plugins(config) {
	let arr = config.plugins ?? [];
	do {
		// @ts-ignore TypeScript doesn't handle flattening Vite's plugin type properly
		arr = (await Promise.all(arr)).flat(Infinity);
		// @ts-ignore can be a Promise
	} while (arr.some((v) => v?.then));

	return arr;
}
