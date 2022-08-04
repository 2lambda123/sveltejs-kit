import ts from 'typescript';
import {
	automigration,
	contains_only,
	error,
	get_function_node,
	get_prop,
	get_prop_initializer_text,
	is_string_like,
	manual_return_migration,
	parse,
	remove_outer_braces,
	rewrite_returns
} from '../utils.js';
import * as TASKS from '../tasks.js';

const give_up = `${error('Update +page.server.js', TASKS.STANDALONE_ENDPOINT)}\n\n`;

/** @param {string} content */
export function migrate_server(content) {
	const file = parse(content);
	if (!file) return give_up + content;

	const unmigrated = new Set(
		['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].filter((name) => file.exports.map.has(name))
	);

	for (const statement of file.ast.statements) {
		for (const method of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']) {
			if (file.exports.map.has(method)) {
				const fn = get_function_node(statement, file.exports.map.get(method));
				if (fn) {
					rewrite_returns(fn.body, (expr, node) => {
						if (
							expr &&
							ts.isObjectLiteralExpression(expr) &&
							contains_only(expr, ['body', 'status', 'headers'], true)
						) {
							const props = expr.properties;

							const body = get_prop(props, 'body');
							const headers = get_prop(props, 'headers');
							const status = get_prop(props, 'status');

							const headers_has_multiple_cookies = /['"]set-cookie['"]:\s*\[/.test(
								headers?.getText()?.toLowerCase()
							);
							const is_safe_transformation =
								(!body ||
									(!ts.isShorthandPropertyAssignment(body) &&
										ts.isObjectLiteralExpression(body.initializer))) &&
								(!headers ||
									((!headers.getText().toLowerCase().includes('content-type') ||
										headers.getText().includes('application/json')) &&
										!headers_has_multiple_cookies));

							const headers_str =
								body &&
								(!ts.isPropertyAssignment(body) || !is_string_like(body.initializer)) &&
								(!headers || !headers.getText().toLowerCase().includes('content-type'))
									? `headers: { 'content-type': 'application/json; charset=utf-8'${
											headers
												? ', ' +
												  (ts.isPropertyAssignment(headers)
														? remove_outer_braces(get_prop_initializer_text(props, 'headers'))
														: '...headers')
												: ''
									  } }`
									: headers
									? headers.getText()
									: undefined;

							const body_str = get_prop_initializer_text(props, 'body');
							const response_body = body
								? (!ts.isPropertyAssignment(body) ||
										!is_string_like(body.initializer) ||
										(headers && headers.getText().includes('application/json'))) &&
								  (!headers ||
										!headers.getText().toLowerCase().includes('content-type') ||
										headers.getText().includes('application/json')) &&
								  !body_str.startsWith('JSON.stringify')
									? `JSON.stringify(${body_str})`
									: body_str
								: 'undefined';

							const response_init =
								headers_str || status
									? // prettier-ignore
									  ', ' +
									(headers_has_multiple_cookies ? '\n// set-cookie with multiple values needs a different conversion, see the link at the top for more info\n' : '') +
									`{ ${headers_str ? `${headers_str}${status ? ', ' : ''}` : ''}${status ? status.getText() : ''} }`
									: '';

							if (is_safe_transformation) {
								automigration(
									node,
									file.code,
									`return new Response(${response_body}${response_init});`
								);
							} else {
								manual_return_migration(
									node,
									file.code,
									TASKS.STANDALONE_ENDPOINT,
									`return new Response(${response_body}${response_init});`
								);
							}
						} else {
							manual_return_migration(node, file.code, TASKS.STANDALONE_ENDPOINT);
						}
					});

					unmigrated.delete(method);
				}
			}
		}
	}

	if (unmigrated.size) {
		return give_up + file.code.toString();
	}

	return file.code.toString();
}
