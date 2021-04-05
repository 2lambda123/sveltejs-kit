import fs from 'fs';
import path from 'path';
import { mkdirp } from '../filesystem/index.js';

/** @type {Map<string, string>} */
const previous_contents = new Map();

/**
 * @param {string} file
 * @param {string} code
 */
export function write_if_changed(file, code) {
	if (code !== previous_contents.get(file)) {
		previous_contents.set(file, code);
		mkdirp(path.dirname(file));
		fs.writeFileSync(file, code);
	}
}

const s = JSON.stringify;

/** @typedef {import('../../../types.internal').ManifestData} ManifestData */

/**
 * @param {{
 *   manifest_data: ManifestData;
 *   output: string;
 *   cwd: string;
 * }} options
 */
export function create_app({ manifest_data, output, cwd = process.cwd() }) {
	const dir = `${output}/generated`;
	const base = path.relative(cwd, dir);

	write_if_changed(`${dir}/manifest.js`, generate_client_manifest(manifest_data, base));

	write_if_changed(`${dir}/root.svelte`, generate_app(manifest_data, base));
}

/**
 * @param {string} str
 */
function trim(str) {
	return str.replace(/^\t\t/gm, '').trim();
}

/**
 * @param {ManifestData} manifest_data
 * @param {string} base
 */
function generate_client_manifest(manifest_data, base) {
	/** @type {Record<string, number>} */
	const component_indexes = {};

	/** @param {string} c */
	const get_path = (c) => path.relative(base, c);

	const components = `[
		${manifest_data.components
			.map((component, i) => {
				component_indexes[component] = i;

				return `() => import(${s(get_path(component))})`;
			})
			.join(',\n\t\t\t\t')}
	]`.replace(/^\t/gm, '');

	const routes = `[
		${manifest_data.routes
			.map((route) => {
				if (route.type === 'page') {
					const params =
						route.params.length > 0 &&
						'(m) => ({ ' +
							route.params
								.map((param, i) => {
									return param.startsWith('...')
										? `${param.slice(3)}: d(m[${i + 1}])`
										: `${param}: d(m[${i + 1}])`;
								})
								.join(', ') +
							'})';

					const tuple = [
						route.pattern,
						`[${route.parts.map((part) => `components[${component_indexes[part]}]`).join(', ')}]`,
						params
					]
						.filter(Boolean)
						.join(', ');

					return `// ${route.parts[route.parts.length - 1]}\n\t\t[${tuple}]`;
				} else {
					return `// ${route.file}\n\t\t[${route.pattern}]`;
				}
			})
			.join(',\n\n\t\t')}
	]`.replace(/^\t/gm, '');

	return trim(`
		import * as layout from ${s(get_path(manifest_data.layout))};
		import * as error from ${s(get_path(manifest_data.error))};

		const components = ${components};

		const d = decodeURIComponent;

		export const routes = ${routes};

		export { layout, error };
	`);
}

/**
 * @param {ManifestData} manifest_data
 * @param {string} base
 */
function generate_app(manifest_data, base) {
	// TODO remove default layout altogether

	const max_depth = Math.max(
		...manifest_data.routes.map((route) =>
			route.type === 'page' ? route.parts.filter(Boolean).length : 0
		)
	);

	const levels = [];
	for (let i = 0; i <= max_depth; i += 1) {
		levels.push(i);
	}

	let l = max_depth;

	let pyramid = `<svelte:component this={components[${l}]} {...(props_${l} || {})}/>`;

	while (l--) {
		pyramid = `
			<svelte:component this={components[${l}]} {...(props_${l} || {})}${
			l === 1 ? ' {status} {error}' : '' // TODO this is awkward
		}>
				{#if components[${l + 1}]}
					${pyramid.replace(/\n/g, '\n\t\t\t\t\t')}
				{/if}
			</svelte:component>
		`
			.replace(/^\t\t\t/gm, '')
			.trim();
	}

	return trim(`
		<!-- This file is generated by @sveltejs/kit — do not edit it! -->
		<script>
			import { setContext, afterUpdate, onMount } from 'svelte';

			// error handling
			export let status = undefined;
			export let error = undefined;

			// stores
			export let stores;
			export let page;

			export let components;
			${levels.map((l) => `export let props_${l} = null;`).join('\n\t\t\t')}

			setContext('__svelte__', stores);

			$: stores.page.set(page);
			afterUpdate(stores.page.notify);

			let mounted = false;
			let navigated = false;
			let title = null;

			onMount(() => {
				const unsubscribe = stores.page.subscribe(() => {
					if (mounted) {
						navigated = true;
						title = document.title;
					}
				});

				mounted = true;
				return unsubscribe;
			});
		</script>

		${pyramid.replace(/\n/g, '\n\t\t')}

		{#if mounted}
			<div id="svelte-announcer" aria-live="assertive" aria-atomic="true">
				{#if navigated}
					Navigated to {title}
				{/if}
			</div>
		{/if}

		<style>
			#svelte-announcer {
				position: absolute;
				left: 0;
				top: 0;
				clip: rect(0 0 0 0);
				clip-path: inset(50%);
				overflow: hidden;
				white-space: nowrap;
				width: 1px;
				height: 1px;
			}
		</style>
	`);
}
