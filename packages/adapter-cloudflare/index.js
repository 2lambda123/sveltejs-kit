import { writeFileSync } from 'fs';
import { posix } from 'path';
import { fileURLToPath } from 'url';
import * as esbuild from 'esbuild';

/** @type {import('.').default} */
export default function () {
	if (arguments.length > 0) {
		throw new Error(
			'esbuild options can no longer be passed to adapter-cloudflare — see https://github.com/sveltejs/kit/pull/4639'
		);
	}

	return {
		name: '@sveltejs/adapter-cloudflare',
		async adapt(builder) {
			const files = fileURLToPath(new URL('./files', import.meta.url).href);
			const dest = builder.getBuildDirectory('cloudflare');
			const tmp = builder.getBuildDirectory('cloudflare-tmp');

			builder.rimraf(dest);
			builder.rimraf(tmp);
			builder.mkdirp(tmp);

			builder.writeStatic(dest);
			builder.writeClient(dest);
			builder.writePrerendered(dest);

			const relativePath = posix.relative(tmp, builder.getServerDirectory());

			writeFileSync(
				`${tmp}/manifest.js`,
				`export const manifest = ${builder.generateManifest({
					relativePath
				})};\n\nexport const prerendered = new Set(${JSON.stringify(builder.prerendered.paths)});\n`
			);

			builder.copy(`${files}/worker.js`, `${tmp}/_worker.js`, {
				replace: {
					SERVER: `${relativePath}/index.js`,
					MANIFEST: './manifest.js'
				}
			});

			await esbuild.build({
				platform: 'browser',
				sourcemap: 'linked',
				target: 'es2020',
				entryPoints: [`${tmp}/_worker.js`],
				outfile: `${dest}/_worker.js`,
				allowOverwrite: true,
				format: 'esm',
				bundle: true
			});
		}
	};
}
