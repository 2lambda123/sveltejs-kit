import fs from 'node:fs';
import path from 'node:path';
import { mkdirp } from '../../utils/filesystem.js';

/** @type {Map<string, string>} */
const previous_contents = new Map();

/**
 * @param {string} file
 * @param {string} code
 */
export function write_if_changed(file, code) {
	if (code !== previous_contents.get(file)) {
		write(file, code);
	}
}

/**
 * @param {string} file
 * @param {string} code
 */
export function write(file, code) {
	previous_contents.set(file, code);
	mkdirp(path.dirname(file));
	fs.writeFileSync(file, code);
}

/** @type {WeakMap<TemplateStringsArray, { strings: string[] }} */
const dedent_map = new WeakMap();

/**
 * @param {TemplateStringsArray} strings
 * @param {any[]} values
 */
export function dedent(strings, ...values) {
	let dedented = dedent_map.get(strings);

	if (!dedented) {
		const indentation = /** @type {RegExpExecArray} */ (/\n?([ \t]*)/.exec(strings[0]))[1];
		const pattern = new RegExp(`^${indentation}`, 'gm');

		dedented = {
			strings: strings.map((str) => str.replace(pattern, ''))
		};

		dedent_map.set(strings, dedented);
	}

	let str = dedented.strings[0];
	for (let i = 0; i < values.length; i += 1) {
		str += values[i] + dedented.strings[i + 1];
	}

	str = str.trim();

	const result = /** @type {string} */ ({
		toString: () => str
	});

	return result;
}
