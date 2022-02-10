import { existsSync, writeFileSync } from 'fs';
import { posix } from 'path';
import { fileURLToPath } from 'url';
import esbuild from 'esbuild';
import { config } from 'process';

const dir = '.vercel_build_output';

// rules for clean URLs and trailing slash handling,
// generated with @vercel/routing-utils
const redirects = {
	always: [
		{
			src: '^/(?:(.+)/)?index(?:\\.html)?/?$',
			headers: {
				Location: '/$1/'
			},
			status: 308
		},
		{
			src: '^/(.*)\\.html/?$',
			headers: {
				Location: '/$1/'
			},
			status: 308
		},
		{
			src: '^/\\.well-known(?:/.*)?$'
		},
		{
			src: '^/((?:[^/]+/)*[^/\\.]+)$',
			headers: {
				Location: '/$1/'
			},
			status: 308
		},
		{
			src: '^/((?:[^/]+/)*[^/]+\\.\\w+)/$',
			headers: {
				Location: '/$1'
			},
			status: 308
		}
	],
	never: [
		{
			src: '^/(?:(.+)/)?index(?:\\.html)?/?$',
			headers: {
				Location: '/$1'
			},
			status: 308
		},
		{
			src: '^/(.*)\\.html/?$',
			headers: {
				Location: '/$1'
			},
			status: 308
		},
		{
			src: '^/(.*)/$',
			headers: {
				Location: '/$1'
			},
			status: 308
		}
	],
	ignore: [
		{
			src: '^/(?:(.+)/)?index(?:\\.html)?/?$',
			headers: {
				Location: '/$1'
			},
			status: 308
		},
		{
			src: '^/(.*)\\.html/?$',
			headers: {
				Location: '/$1'
			},
			status: 308
		}
	]
};

/** @type {import('.')} **/
export default function ({ external = [] } = {}) {
	return {
		name: '@sveltejs/adapter-vercel',

		async adapt(builder) {
			const tmp = builder.getBuildDirectory('vercel-tmp');

			builder.rimraf(dir);
			builder.rimraf(tmp);

			const files = fileURLToPath(new URL('./files', import.meta.url));

			const dirs = {
				static: `${dir}/static`,
				lambda: `${dir}/functions/node/render`
			};

			builder.log.minor('Prerendering static pages...');

			const prerendered = await builder.prerender({
				dest: `${dir}/static`
			});

			builder.log.minor('Generating serverless function...');

			const relativePath = posix.relative(tmp, builder.getServerDirectory());

			builder.copy(files, tmp, {
				replace: {
					APP: `${relativePath}/app.js`,
					MANIFEST: './manifest.js'
				}
			});

			writeFileSync(
				`${tmp}/manifest.js`,
				`export const manifest = ${builder.generateManifest({
					relativePath
				})};\n`
			);

			await esbuild.build({
				entryPoints: [`${tmp}/entry.js`],
				outfile: `${dirs.lambda}/index.js`,
				target: 'node14',
				bundle: true,
				platform: 'node',
				external
			});

			writeFileSync(`${dirs.lambda}/package.json`, JSON.stringify({ type: 'commonjs' }));

			builder.log.minor('Copying assets...');

			builder.writeStatic(dirs.static);
			builder.writeClient(dirs.static);

			builder.log.minor('Writing routes...');

			builder.mkdirp(`${dir}/config`);

			const prerendered_routes = prerendered.paths
				.map((path) => {
					const file =
						path === '/'
							? '/index.html'
							: path + (builder.trailingSlash === 'always' ? '/index.html' : '.html');

					if (existsSync(`${dir}/static${file}`)) {
						return {
							src: path,
							dest: file
						};
					}
				})
				.filter(Boolean);

			writeFileSync(
				`${dir}/config/routes.json`,
				JSON.stringify([
					...redirects[builder.trailingSlash],
					...prerendered_routes,
					{
						src: `/${builder.appDir}/.+`,
						headers: {
							'cache-control': 'public, immutable, max-age=31536000'
						}
					},
					{
						handle: 'filesystem'
					},
					{
						src: '/.*',
						dest: '.vercel/functions/render'
					}
				])
			);
		}
	};
}
