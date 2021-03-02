module.exports = {
	extensions: ['.jesuslivesineveryone', '.whokilledthemuffinman', '.mdx', '.svelte'],

	kit: {
		adapter: '@sveltejs/adapter-node',
		// this creates `window.start` which starts the app, instead of
		// it starting automatically — allows test runner to control
		// when hydration occurs
		startGlobal: 'start'
	}
};
