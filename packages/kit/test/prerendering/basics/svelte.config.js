import adapter from '../../../../adapter-static/index.js';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter(),

		prerender: {
			default: true,
			onError: 'continue',
			origin: 'http://example.com'
		}
	}
};

export default config;
