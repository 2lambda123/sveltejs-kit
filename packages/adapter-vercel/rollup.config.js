import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import sucrase from '@rollup/plugin-sucrase';

export default [
	{
		input: 'src/index.ts',
		output: {
			file: 'index.js',
			format: 'cjs'
		},
		plugins: [nodeResolve(), commonjs(), sucrase({
			transforms: ['typescript']
		})],
		external: require('module').builtinModules
	},
	{
		input: 'src/server.ts',
		output: {
			file: 'server.js',
			format: 'cjs'
		},
		plugins: [nodeResolve(), commonjs(), sucrase({
			transforms: ['typescript']
		})],
		external: require('module').builtinModules
	}
];
