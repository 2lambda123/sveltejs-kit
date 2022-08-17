import fs from 'fs';
import path from 'path';
import { mkdirp } from '@internal/shared/utils/filesystem.js';

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

/**
 * @param {(file: string) => boolean} should_remove
 */
export function remove_from_previous(should_remove) {
	for (const key of previous_contents.keys()) {
		if (should_remove(key)) {
			previous_contents.delete(key);
		}
	}
}

/** @param {string} str */
export function trim(str) {
	const indentation = /** @type {RegExpExecArray} */ (/\n?(\s*)/.exec(str))[1];
	const pattern = new RegExp(`^${indentation}`, 'gm');
	return str.replace(pattern, '').trim();
}
