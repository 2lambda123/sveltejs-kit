import { escape_html_attr } from '../../../utils/escape.js';
import { hash } from '../../hash.js';

/**
 * Inside a script element, only `</script` and `<!--` hold special meaning to the HTML parser.
 *
 * The first closes the script element, so everything after is treated as raw HTML.
 * The second disables further parsing until `-->`, so the script element might be unexpectedly
 * kept open until until an unrelated HTML comment in the page.
 *
 * U+2028 LINE SEPARATOR and U+2029 PARAGRAPH SEPARATOR are escaped for the sake of pre-2018
 * browsers.
 *
 * @see tests for unsafe parsing examples.
 * @see https://html.spec.whatwg.org/multipage/scripting.html#restrictions-for-contents-of-script-elements
 * @see https://html.spec.whatwg.org/multipage/syntax.html#cdata-rcdata-restrictions
 * @see https://html.spec.whatwg.org/multipage/parsing.html#script-data-state
 * @see https://html.spec.whatwg.org/multipage/parsing.html#script-data-double-escaped-state
 * @see https://github.com/tc39/proposal-json-superset
 * @type {Record<string, string>}
 */
const replacements = {
	'<': '\\u003C',
	'\u2028': '\\u2028',
	'\u2029': '\\u2029'
};

const pattern = new RegExp(`[${Object.keys(replacements).join('')}]`, 'g');

/**
 * Generates a raw HTML string containing a safe script element carrying data and associated attributes.
 *
 * It escapes all the special characters needed to guarantee the element is unbroken, but care must
 * be taken to ensure it is inserted in the document at an acceptable position for a script element,
 * and that the resulting string isn't further modified.
 *
 * @param {import('./types.js').Fetched} fetched
 * @param {(name: string, value: string) => boolean} filter
 * @param {boolean} [prerendering]
 * @returns {string} The raw HTML of a script element carrying the JSON payload.
 * @example const html = serialize_data('/data.json', null, { foo: 'bar' });
 */
export function serialize_data(fetched, filter, prerendering = false) {
	/** @type {Record<string, string>} */
	const headers = {};

	let cache_control = null;
	let age = null;
	let vary = false;

	for (const [key, value] of fetched.response.headers) {
		if (filter(key, value)) {
			headers[key] = value;
		}

		if (key === 'cache-control') cache_control = value;
		if (key === 'age') age = value;
		if (key === 'vary') vary = true;
	}

	const payload = {
		status: fetched.response.status,
		statusText: fetched.response.statusText,
		headers,
		body: fetched.response_body
	};

	const safe_payload = JSON.stringify(payload).replace(pattern, (match) => replacements[match]);

	const attrs = [
		'type="application/json"',
		'data-sveltekit-fetched',
		`data-url=${escape_html_attr(fetched.url)}`
	];

	const requestData = {};
	if (fetched.request_headers) {
		requestData.headers = [...new Headers(fetched.request_headers)].join(',');
	}
	if (fetched.request_body) {
		requestData.body = fetched.request_body;
	}
	const valuesToHash = Object.values(requestData).filter(v => v !== undefined);
	if (valuesToHash.length > 0) {
		const hashValue = hash(...valuesToHash);
		attrs.push(`data-hash="${hashValue}"`);
	}

	// Compute the time the response should be cached, taking into account max-age and age.
	// Do not cache at all if a vary header is present, as this indicates that the cache is
	// likely to get busted. It would also mean we'd have to add more logic to computing the
	// selector on the client which results in more code for 99% of people for the 1% who use vary.
	if (!prerendering && fetched.method === 'GET' && cache_control && !vary) {
		const match = /s-maxage=(\d+)/g.exec(cache_control) ?? /max-age=(\d+)/g.exec(cache_control);
		if (match) {
			const ttl = +match[1] - +(age ?? '0');
			attrs.push(`data-ttl="${ttl}"`);
		}
	}

	return `<script ${attrs.join(' ')}>${safe_payload}</script>`;
}
