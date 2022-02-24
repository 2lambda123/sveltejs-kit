import fs from 'fs';
import ts from 'typescript';
import prettier from 'prettier';

/** @typedef {{ name: string, comment: string, snippet: string }} Extracted */

/** @type {Array<{ name: string, comment: string, exports: Extracted[], types: Extracted[] }>} */
const modules = [];

/**
 * @param {string} code
 * @param {ts.NodeArray<ts.Statement>} statements
 */
function get_types(code, statements) {
	/** @type {Extracted[]} */
	const exports = [];

	/** @type {Extracted[]} */
	const types = [];

	for (const statement of statements) {
		if (
			ts.isClassDeclaration(statement) ||
			ts.isInterfaceDeclaration(statement) ||
			ts.isTypeAliasDeclaration(statement) ||
			ts.isModuleDeclaration(statement) ||
			ts.isVariableStatement(statement) ||
			ts.isFunctionDeclaration(statement)
		) {
			const name_node = ts.isVariableStatement(statement)
				? statement.declarationList.declarations[0]
				: statement;

			// @ts-ignore no idea why it's complaining here
			const name = name_node.name?.escapedText;

			let start = statement.pos;
			let comment = '';

			// @ts-ignore i think typescript is bad at typescript
			if (statement.jsDoc) {
				// @ts-ignore
				comment = statement.jsDoc[0].comment;
				// @ts-ignore
				start = statement.jsDoc[0].end;
			}

			const i = code.indexOf('export', start);
			start = i + 6;

			const snippet = prettier.format(code.slice(start, statement.end).trim(), {
				parser: 'typescript',
				printWidth: 60,
				useTabs: true,
				singleQuote: true,
				trailingComma: 'none'
			});

			const collection =
				ts.isVariableStatement(statement) || ts.isFunctionDeclaration(statement) ? exports : types;

			collection.push({ name, comment, snippet });
		} else {
			// console.log(statement.kind);
		}
	}

	types.sort((a, b) => (a.name < b.name ? -1 : 1));
	exports.sort((a, b) => (a.name < b.name ? -1 : 1));

	return { types, exports };
}

{
	const code = fs.readFileSync('types/index.d.ts', 'utf-8');
	const node = ts.createSourceFile('index.d.ts', code, ts.ScriptTarget.Latest);

	modules.push({
		name: '@sveltejs/kit',
		comment: '',
		...get_types(code, node.statements)
	});
}

{
	const code = fs.readFileSync('types/ambient.d.ts', 'utf-8');
	const node = ts.createSourceFile('ambient.d.ts', code, ts.ScriptTarget.Latest);

	for (const statement of node.statements) {
		if (ts.isModuleDeclaration(statement)) {
			// @ts-ignore
			const name = statement.name.text || statement.name.escapedText;

			// @ts-ignore
			const comment = statement.jsDoc?.[0].comment ?? '';

			modules.push({
				name,
				comment,
				// @ts-ignore
				...get_types(code, statement.body.statements)
			});
		}
	}
}

modules.sort((a, b) => {
	if (a.name === 'App') return +1;
	if (b.name === 'App') return -1;

	if (a.name[0] === '@' && b.name[0] === '$') return +1;
	if (a.name[0] === '$' && b.name[0] === '@') return -1;

	return a.name < b.name ? -1 : 1;
});

fs.writeFileSync(
	'../../documentation/types.js',
	`
/* This file is generated by running \`node scripts/extract-types.js\`
   in the packages/kit directory — do not edit it */
export const modules = ${JSON.stringify(modules, null, '  ')};
`.trim()
);
