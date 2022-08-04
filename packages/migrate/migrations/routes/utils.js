import fs from 'fs';
import path from 'path';
import colors from 'kleur';
import ts from 'typescript';
import MagicString from 'magic-string';
import { execSync } from 'child_process';
import * as TASKS from './tasks.js';

/** @param {string} message */
export function bail(message) {
	console.error(colors.bold().red(message));
	process.exit(1);
}

/** @param {string} file */
export function relative(file) {
	return path.relative('.', file);
}

/**
 * @param {string} description
 * @param {string} [comment_id]
 */
export function task(description, comment_id) {
	return (
		`@migration task: ${description}` +
		(comment_id
			? ` (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-${comment_id})`
			: '')
	);
}

/**
 * @param {string} description
 * @param {string} comment_id
 */
export function error(description, comment_id) {
	return `throw new Error(${JSON.stringify(task(description, comment_id))});`;
}

/**
 *
 * @param {string} file
 * @param {string} renamed
 * @param {string} content
 * @param {boolean} use_git
 */
export function move_file(file, renamed, content, use_git) {
	if (use_git) {
		execSync(`git mv ${file} ${renamed}`);
	} else {
		fs.unlinkSync(file);
	}

	fs.writeFileSync(renamed, content);
}

/**
 * @param {string} content
 * @param {boolean} is_error
 * @param {boolean} moved
 */
export function extract_load(content, is_error, moved) {
	/** @type {string | null} */
	let module = null;

	const main = content.replace(
		/<script([^>]+?context=(['"])module\1[^>]*)>([^]*?)<\/script>/,
		(match, attrs, quote, contents) => {
			const imports = extract_static_imports(moved ? adjust_imports(contents) : contents);

			if (is_error) {
				// special case — load is no longer supported in load
				const indent = guess_indent(contents) ?? '';

				contents = comment(contents);
				const body = `\n${indent}${error('Replace error load function', '3293209')}\n${contents}`;

				return `<script${attrs}>${body}</script>`;
			}

			module = contents.replace(/^\n/, '');
			return `<!--\n${task(
				'Check for missing imports and code that should be moved back to the module context',
				TASKS.PAGE_MODULE_CTX
			)}\n\nThe following imports were found:\n${imports.length ? imports.join('\n') : '-'}\n-->`;
		}
	);

	return { module, main };
}

/**
 * @param {string} contents
 */
export function comment(contents) {
	return contents.replace(/^(.+)/gm, '// $1');
}

/** @param {string} content */
export function adjust_imports(content) {
	try {
		const ast = ts.createSourceFile(
			'filename.ts',
			content,
			ts.ScriptTarget.Latest,
			true,
			ts.ScriptKind.TS
		);

		const code = new MagicString(content);

		/** @param {number} pos */
		function adjust(pos) {
			// TypeScript AST is a clusterfuck, we need to step forward to find
			// where the node _actually_ starts
			while (content[pos] !== '.') pos += 1;

			// replace ../ with ../../ and ./ with ../
			code.prependLeft(pos, content[pos + 1] === '.' ? '../' : '.');
		}

		/** @param {ts.Node} node */
		function walk(node) {
			if (ts.isImportDeclaration(node)) {
				const text = /** @type {ts.StringLiteral} */ (node.moduleSpecifier).text;
				if (text[0] === '.') adjust(node.moduleSpecifier.pos);
			}

			if (ts.isCallExpression(node) && node.expression.getText() === 'import') {
				const arg = node.arguments[0];

				if (ts.isStringLiteral(arg)) {
					if (arg.text[0] === '.') adjust(arg.pos);
				} else if (ts.isTemplateLiteral(arg) && !ts.isNoSubstitutionTemplateLiteral(arg)) {
					if (arg.head.text[0] === '.') adjust(arg.head.pos);
				}
			}

			node.forEachChild(walk);
		}

		ast.forEachChild(walk);

		return code.toString();
	} catch {
		// this is enough of an edge case that it's probably fine to
		// just leave the code as we found it
		return content;
	}
}

/** @param {string} content */
export function extract_static_imports(content) {
	try {
		const ast = ts.createSourceFile(
			'filename.ts',
			content,
			ts.ScriptTarget.Latest,
			true,
			ts.ScriptKind.TS
		);

		/** @type {string[]} */
		let imports = [];

		/** @param {ts.Node} node */
		function walk(node) {
			if (ts.isImportDeclaration(node)) {
				imports.push(node.getText());
			}

			node.forEachChild(walk);
		}

		ast.forEachChild(walk);

		return imports;
	} catch {
		return [];
	}
}

/** @param {string} content */
export function dedent(content) {
	const indent = guess_indent(content);
	if (!indent) return content;

	/** @type {string[]} */
	const substitutions = [];

	try {
		const ast = ts.createSourceFile(
			'filename.ts',
			content,
			ts.ScriptTarget.Latest,
			true,
			ts.ScriptKind.TS
		);

		const code = new MagicString(content);

		/** @param {ts.Node} node */
		function walk(node) {
			if (ts.isTemplateLiteral(node)) {
				let pos = node.pos;
				while (/\s/.test(content[pos])) pos += 1;

				code.overwrite(pos, node.end, `____SUBSTITUTION_${substitutions.length}____`);
				substitutions.push(node.getText());
			}

			node.forEachChild(walk);
		}

		ast.forEachChild(walk);

		return code
			.toString()
			.replace(new RegExp(`^${indent}`, 'gm'), '')
			.replace(/____SUBSTITUTION_(\d+)____/g, (match, index) => substitutions[index]);
	} catch {
		// as above — ignore this edge case
		return content;
	}
}

/** @param {string} content */
export function guess_indent(content) {
	const lines = content.split('\n');

	const tabbed = lines.filter((line) => /^\t+/.test(line));
	const spaced = lines.filter((line) => /^ {2,}/.test(line));

	if (tabbed.length === 0 && spaced.length === 0) {
		return null;
	}

	// More lines tabbed than spaced? Assume tabs, and
	// default to tabs in the case of a tie (or nothing
	// to go on)
	if (tabbed.length >= spaced.length) {
		return '\t';
	}

	// Otherwise, we need to guess the multiple
	const min = spaced.reduce((previous, current) => {
		const count = /^ +/.exec(current)[0].length;
		return Math.min(count, previous);
	}, Infinity);

	return new Array(min + 1).join(' ');
}

/**
 * @param {string} content
 * @param {string} indent
 */
export function indent_with(content, indent) {
	return indent + content.split('\n').join('\n' + indent);
}

/**
 * @param {string} content
 * @param {number} offset
 */
export function indent_at_line(content, offset) {
	const substr = content.substring(content.lastIndexOf('\n', offset) + 1, offset);
	return /\s*/.exec(substr)[0];
}

/**
 *
 * @param {ts.ObjectLiteralExpression} node
 * @param {string[]} valid_keys
 * @param {boolean} [allow_empty]
 */
export function contains_only(node, valid_keys, allow_empty = false) {
	return (
		(allow_empty || node.properties.length > 0) &&
		node.properties.every(
			(prop) =>
				(ts.isPropertyAssignment(prop) || ts.isShorthandPropertyAssignment(prop)) &&
				ts.isIdentifier(prop.name) &&
				valid_keys.includes(prop.name.text)
		)
	);
}

/**
 *
 * @param {ts.Node} node
 * @param {MagicString} str
 * @param {string} comment_nr
 * @param {string} [suggestion]
 */
export function manual_return_migration(node, str, comment_nr, suggestion) {
	str.prependLeft(
		node.getStart(),
		error('Migrate this return statement', comment_nr) +
			'\n' +
			(suggestion
				? indent_with(
						comment(`Suggestion (check for correctness before using):\n${suggestion}`) + '\n',
						indent_at_line(str.original, node.getStart())
				  )
				: indent_at_line(str.original, node.getStart()))
	);
}

/**
 *
 * @param {ts.Node} node
 * @param {MagicString} str
 * @param {string} migration
 */
export function automigration(node, str, migration) {
	str.overwrite(node.getStart(), node.getEnd(), migration);
}

/**
 * @param {ts.NodeArray<ts.ObjectLiteralElementLike>} node
 * @param {string} name
 * @returns {undefined | ts.ShorthandPropertyAssignment | ts.PropertyAssignment}
 */
export function get_prop(node, name) {
	return /** @type {any} */ (
		node.find(
			(prop) =>
				(ts.isPropertyAssignment(prop) || ts.isShorthandPropertyAssignment(prop)) &&
				ts.isIdentifier(prop.name) &&
				prop.name.text === name
		)
	);
}

/**
 * @param {ts.ObjectLiteralExpression} node
 */
export function get_object_nodes(node) {
	/** @type {Record<string, ts.Node>} */
	const obj = {};

	for (const property of node.properties) {
		if (ts.isPropertyAssignment(property) && ts.isIdentifier(property.name)) {
			obj[property.name.text] = property.initializer;
		} else if (ts.isShorthandPropertyAssignment(property)) {
			obj[property.name.text] = property.name;
		} else {
			return null; // object contains funky stuff like computed properties/accessors — bail
		}
	}

	return obj;
}

/**
 * @param {ts.NodeArray<ts.ObjectLiteralElementLike>} node
 * @param {string} name
 */
export function get_prop_initializer_text(node, name) {
	const prop = get_prop(node, name);
	return prop
		? ts.isShorthandPropertyAssignment(prop)
			? name
			: prop.initializer.getText()
		: 'undefined';
}

/**
 * @param {string} str
 */
export function remove_outer_braces(str) {
	return str.substring(str.indexOf('{') + 1, str.lastIndexOf('}'));
}

/**
 * @param {ts.Node} node
 */
export function is_string_like(node) {
	return (
		ts.isStringLiteral(node) ||
		ts.isTemplateExpression(node) ||
		ts.isNoSubstitutionTemplateLiteral(node)
	);
}

/** @param {ts.SourceFile} node */
export function get_exports(node) {
	/** @type {Map<string, string>} */
	const map = new Map();

	let complex = false;

	for (const statement of node.statements) {
		if (ts.isExportDeclaration(statement) && ts.isNamedExports(statement.exportClause)) {
			// export { x }, export { x as y }
			for (const specifier of statement.exportClause.elements) {
				map.set(specifier.name.text, specifier.propertyName?.text || specifier.name.text);
			}
		} else if (
			ts.isFunctionDeclaration(statement) &&
			statement.modifiers?.[0]?.kind === ts.SyntaxKind.ExportKeyword
		) {
			// export function x ...
			map.set(statement.name.text, statement.name.text);
		} else if (
			ts.isVariableStatement(statement) &&
			statement.modifiers?.[0]?.kind === ts.SyntaxKind.ExportKeyword
		) {
			// export const x = ..., y = ...
			for (const declaration of statement.declarationList.declarations) {
				if (ts.isIdentifier(declaration.name)) {
					map.set(declaration.name.text, declaration.name.text);
				} else {
					// might need to bail out on encountering this edge case,
					// because this stuff can get pretty intense
					complex = true;
				}
			}
		}
	}

	return { map, complex };
}

/**
 * @param {ts.Node} statement
 * @param {string[]} names
 * @returns {ts.FunctionDeclaration | ts.FunctionExpression | ts.ArrowFunction | void}
 */
export function get_function_node(statement, ...names) {
	if (ts.isFunctionDeclaration(statement) && names.includes(statement.name.text)) {
		// export function x ...
		return statement;
	}

	if (ts.isVariableStatement(statement)) {
		for (const declaration of statement.declarationList.declarations) {
			if (
				ts.isIdentifier(declaration.name) &&
				names.includes(declaration.name.text) &&
				(ts.isArrowFunction(declaration.initializer) ||
					ts.isFunctionExpression(declaration.initializer))
			) {
				// export const x = ...
				return declaration.initializer;
			}
		}
	}
}

/**
 * Utility for rewriting return statements. If `node` is `undefined`,
 * it means it's a concise arrow function body (`() => ({}))`
 * @param {ts.Block | ts.ConciseBody} block
 * @param {(expression: ts.Expression, node: ts.ReturnStatement | void) => void} callback
 */
export function rewrite_returns(block, callback) {
	if (ts.isBlock(block)) {
		/** @param {ts.Node} node */
		function walk(node) {
			if (
				ts.isArrowFunction(node) ||
				ts.isFunctionExpression(node) ||
				ts.isFunctionDeclaration(node)
			) {
				// don't cross this boundary
				return;
			}

			if (ts.isReturnStatement(node)) {
				callback(node.expression, node);
				return;
			}

			node.forEachChild(walk);
		}

		block.forEachChild(walk);
	} else {
		while (ts.isParenthesizedExpression(block)) {
			block = block.expression;
		}

		callback(block, null);
	}
}

/** @param {string} content */
export function parse(content) {
	try {
		const ast = ts.createSourceFile(
			'filename.ts',
			content,
			ts.ScriptTarget.Latest,
			true,
			ts.ScriptKind.TS
		);

		const code = new MagicString(content);

		return {
			ast,
			code,
			exports: get_exports(ast)
		};
	} catch {
		return null;
	}
}

/** @param {string} test_file */
export function read_samples(test_file) {
	const markdown = fs.readFileSync(new URL('./samples.md', test_file), 'utf8');
	const samples = markdown
		.split(/^##/gm)
		.slice(1)
		.map((block) => {
			const description = block.split('\n')[0];
			const before = /```js before\n([^]*?)\n```/.exec(block);
			const after = /```js after\n([^]*?)\n```/.exec(block);

			return {
				description,
				before: before ? before[1] : '',
				after: after ? after[1] : '',
				solo: block.includes('> solo')
			};
		});

	if (samples.some((sample) => sample.solo)) {
		return samples.filter((sample) => sample.solo);
	}

	return samples;
}
