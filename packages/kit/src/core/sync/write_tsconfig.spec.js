import { assert, expect, test } from 'vitest';
import { validate_config } from '../config/index.js';
import { get_tsconfig } from './write_tsconfig.js';

test('Creates tsconfig path aliases from kit.alias', () => {
	const { kit } = validate_config({
		kit: {
			alias: {
				simpleKey: 'simple/value',
				key: 'value',
				'key/*': 'some/other/value/*',
				keyToFile: 'path/to/file.ts'
			}
		}
	});

	const { compilerOptions } = get_tsconfig(kit, false);

	// $lib isn't part of the outcome because there's a "path exists"
	// check in the implementation
	expect(compilerOptions.paths).toEqual({
		simpleKey: ['../simple/value'],
		'simpleKey/*': ['../simple/value/*'],
		key: ['../value'],
		'key/*': ['../some/other/value/*'],
		keyToFile: ['../path/to/file.ts']
	});
});

test('Creates tsconfig path aliases from kit.alias with existing baseUrl', () => {
	const { kit } = validate_config({
		kit: {
			alias: {
				simpleKey: 'simple/value',
				key: 'value',
				'key/*': 'some/other/value/*',
				keyToFile: 'path/to/file.ts'
			}
		}
	});

	const { compilerOptions } = get_tsconfig(kit, true);

	// $lib isn't part of the outcome because there's a "path exists"
	// check in the implementation
	expect(compilerOptions.paths).toEqual({
		simpleKey: ['simple/value'],
		'simpleKey/*': ['simple/value/*'],
		key: ['value'],
		'key/*': ['some/other/value/*'],
		keyToFile: ['path/to/file.ts']
	});
});

test('Allows generated tsconfig to be mutated', () => {
	const { kit } = validate_config({
		kit: {
			typescript: {
				config: (config) => {
					config.extends = 'some/other/tsconfig.json';
				}
			}
		}
	});

	const config = get_tsconfig(kit, false);

	// @ts-expect-error
	assert.equal(config.extends, 'some/other/tsconfig.json');
});

test('Allows generated tsconfig to be replaced', () => {
	const { kit } = validate_config({
		kit: {
			typescript: {
				config: (config) => ({
					...config,
					extends: 'some/other/tsconfig.json'
				})
			}
		}
	});

	const config = get_tsconfig(kit, false);

	// @ts-expect-error
	assert.equal(config.extends, 'some/other/tsconfig.json');
});

test('Creates tsconfig include from kit.files', () => {
	const { kit } = validate_config({
		kit: {
			files: {
				lib: 'app'
			}
		}
	});

	const { include } = get_tsconfig(kit, false);

	expect(include).toEqual([
		'ambient.d.ts',
		'./types/**/$types.d.ts',
		'../vite.config.js',
		'../vite.config.ts',
		'../app/**/*.js',
		'../app/**/*.ts',
		'../app/**/*.svelte',
		'../src/**/*.js',
		'../src/**/*.ts',
		'../src/**/*.svelte',
		'../tests/**/*.js',
		'../tests/**/*.ts',
		'../tests/**/*.svelte'
	]);
});
