import { escape_html_attr } from '../../../utils/escape.js';
import { base64, sha256 } from './crypto.js';

const array = new Uint8Array(16);

function generate_nonce() {
	crypto.getRandomValues(array);
	return base64(array);
}

const quoted = new Set([
	'self',
	'unsafe-eval',
	'unsafe-hashes',
	'unsafe-inline',
	'none',
	'strict-dynamic',
	'report-sample',
	'wasm-unsafe-eval',
	'script'
]);

const crypto_pattern = /^(nonce|sha\d\d\d)-/;

// CSP and CSP Report Only are extremely similar with a few caveats
// the easiest/DRYest way to express this is with some private encapsulation
class BaseProvider {
	/** @type {boolean} */
	#use_hashes;

	/** @type {boolean} */
	#script_needs_csp;

	/** @type {boolean} */
	#style_needs_csp;

	/** @type {import('types').CspDirectives} */
	#directives;

	/** @type {import('types').Csp.Source[]} */
	#script_src;

	/** @type {import('types').Csp.Source[]} */
	#script_src_elem;

	/** @type {import('types').Csp.Source[]} */
	#style_src;

	/** @type {import('types').Csp.Source[]} */
	#style_src_attr;

	/** @type {import('types').Csp.Source[]} */
	#style_src_elem;

	/** @type {string} */
	#nonce;

	/**
	 * @param {boolean} use_hashes
	 * @param {import('types').CspDirectives} directives
	 * @param {string} nonce
	 */
	constructor(use_hashes, directives, nonce) {
		this.#use_hashes = use_hashes;
		this.#directives = __SVELTEKIT_DEV__ ? { ...directives } : directives; // clone in dev so we can safely mutate

		const d = this.#directives;

		this.#script_src = [];
		this.#script_src_elem = [];
		this.#style_src = [];
		this.#style_src_attr = [];
		this.#style_src_elem = [];

		const effective_script_src = d['script-src'] || d['default-src'];
		const script_src_elem = d['script-src-elem'];
		const effective_style_src = d['style-src'] || d['default-src'];
		const style_src_attr = d['style-src-attr'];
		const style_src_elem = d['style-src-elem'];

		if (__SVELTEKIT_DEV__) {
			// remove strict-dynamic in dev...
			// TODO reinstate this if we can figure out how to make strict-dynamic work
			// if (d['default-src']) {
			// 	d['default-src'] = d['default-src'].filter((name) => name !== 'strict-dynamic');
			// 	if (d['default-src'].length === 0) delete d['default-src'];
			// }

			// if (d['script-src']) {
			// 	d['script-src'] = d['script-src'].filter((name) => name !== 'strict-dynamic');
			// 	if (d['script-src'].length === 0) delete d['script-src'];
			// }

			// ...and add unsafe-inline so we can inject <style> elements
			if (effective_style_src && !effective_style_src.includes('unsafe-inline')) {
				d['style-src'] = [...effective_style_src, 'unsafe-inline'];
			}

			if (style_src_attr && !style_src_attr.includes('unsafe-inline')) {
				d['style-src-attr'] = [...style_src_attr, 'unsafe-inline'];
			}

			if (style_src_elem && !style_src_elem.includes('unsafe-inline')) {
				d['style-src-elem'] = [...style_src_elem, 'unsafe-inline'];
			}
		}

		this.#script_needs_csp =
			(!!effective_script_src &&
				effective_script_src.filter((value) => value !== 'unsafe-inline').length > 0) ||
			(!!script_src_elem &&
				script_src_elem.filter((value) => value !== 'unsafe-inline').length > 0);

		this.#style_needs_csp =
			!__SVELTEKIT_DEV__ &&
			((!!effective_style_src &&
				effective_style_src.filter((value) => value !== 'unsafe-inline').length > 0) ||
				(!!style_src_attr &&
					style_src_attr.filter((value) => value !== 'unsafe-inline').length > 0) ||
				(!!style_src_elem &&
					style_src_elem.filter((value) => value !== 'unsafe-inline').length > 0));

		this.script_needs_nonce = this.#script_needs_csp && !this.#use_hashes;
		this.style_needs_nonce = this.#style_needs_csp && !this.#use_hashes;
		this.#nonce = nonce;
	}

	/** @param {string} content */
	add_script(content) {
		if (this.#script_needs_csp) {
			const d = this.#directives;

			if (this.#use_hashes) {
				const hash = sha256(content);

				this.#script_src.push(`sha256-${hash}`);

				if (d['script-src-elem']?.length) {
					this.#script_src_elem.push(`sha256-${hash}`);
				}
			} else {
				if (this.#script_src.length === 0) {
					this.#script_src.push(`nonce-${this.#nonce}`);
				}
				if (d['script-src-elem']?.length) {
					this.#script_src_elem.push(`nonce-${this.#nonce}`);
				}
			}
		}
	}

	/** @param {string} content */
	add_style(content) {
		if (this.#style_needs_csp) {
			const d = this.#directives;

			if (this.#use_hashes) {
				const hash = sha256(content);

				this.#style_src.push(`sha256-${hash}`);

				if (d['style-src-attr']?.length) {
					this.#style_src_attr.push(`sha256-${hash}`);
				}
				if (d['style-src-elem']?.length) {
					this.#style_src_elem.push(`sha256-${hash}`);
				}
			} else {
				if (this.#style_src.length === 0) {
					this.#style_src.push(`nonce-${this.#nonce}`);
				}
				if (d['style-src-attr']?.length) {
					this.#style_src_attr.push(`nonce-${this.#nonce}`);
				}
				if (d['style-src-elem']?.length) {
					this.#style_src_elem.push(`nonce-${this.#nonce}`);
				}
			}
		}
	}

	/**
	 * @param {boolean} [is_meta]
	 */
	get_header(is_meta = false) {
		const header = [];

		// due to browser inconsistencies, we can't append sources to default-src
		// (specifically, Firefox appears to not ignore nonce-{nonce} directives
		// on default-src), so we ensure that script-src and style-src exist

		const directives = { ...this.#directives };

		if (this.#style_src.length > 0) {
			directives['style-src'] = [
				...(directives['style-src'] || directives['default-src'] || []),
				...this.#style_src
			];
		}

		if (this.#style_src_attr.length > 0) {
			directives['style-src-attr'] = [
				...(directives['style-src-attr'] || []),
				...this.#style_src_attr
			];
		}

		if (this.#style_src_elem.length > 0) {
			directives['style-src-elem'] = [
				...(directives['style-src-elem'] || []),
				...this.#style_src_elem
			];
		}

		if (this.#script_src.length > 0) {
			directives['script-src'] = [
				...(directives['script-src'] || directives['default-src'] || []),
				...this.#script_src
			];
		}

		if (this.#script_src_elem.length > 0) {
			directives['script-src-elem'] = [
				...(directives['script-src-elem'] || []),
				...this.#script_src_elem
			];
		}

		for (const key in directives) {
			if (is_meta && (key === 'frame-ancestors' || key === 'report-uri' || key === 'sandbox')) {
				// these values cannot be used with a <meta> tag
				// TODO warn?
				continue;
			}

			// @ts-expect-error gimme a break typescript, `key` is obviously a member of internal_directives
			const value = /** @type {string[] | true} */ (directives[key]);

			if (!value) continue;

			const directive = [key];
			if (Array.isArray(value)) {
				value.forEach((value) => {
					if (quoted.has(value) || crypto_pattern.test(value)) {
						directive.push(`'${value}'`);
					} else {
						directive.push(value);
					}
				});
			}

			header.push(directive.join(' '));
		}

		return header.join('; ');
	}
}

class CspProvider extends BaseProvider {
	get_meta() {
		const content = this.get_header(true);

		if (!content) {
			return;
		}

		return `<meta http-equiv="content-security-policy" content=${escape_html_attr(content)}>`;
	}
}

class CspReportOnlyProvider extends BaseProvider {
	/**
	 * @param {boolean} use_hashes
	 * @param {import('types').CspDirectives} directives
	 * @param {string} nonce
	 */
	constructor(use_hashes, directives, nonce) {
		super(use_hashes, directives, nonce);

		if (Object.values(directives).filter((v) => !!v).length > 0) {
			// If we're generating content-security-policy-report-only,
			// if there are any directives, we need a report-uri or report-to (or both)
			// else it's just an expensive noop.
			const has_report_to = directives['report-to']?.length ?? 0 > 0;
			const has_report_uri = directives['report-uri']?.length ?? 0 > 0;
			if (!has_report_to && !has_report_uri) {
				throw Error(
					'`content-security-policy-report-only` must be specified with either the `report-to` or `report-uri` directives, or both'
				);
			}
		}
	}
}

export class Csp {
	/** @readonly */
	nonce = generate_nonce();

	/** @type {CspProvider} */
	csp_provider;

	/** @type {CspReportOnlyProvider} */
	report_only_provider;

	/**
	 * @param {import('./types.js').CspConfig} config
	 * @param {import('./types.js').CspOpts} opts
	 */
	constructor({ mode, directives, reportOnly }, { prerender }) {
		const use_hashes = mode === 'hash' || (mode === 'auto' && prerender);
		this.csp_provider = new CspProvider(use_hashes, directives, this.nonce);
		this.report_only_provider = new CspReportOnlyProvider(use_hashes, reportOnly, this.nonce);
	}

	get script_needs_nonce() {
		return this.csp_provider.script_needs_nonce || this.report_only_provider.script_needs_nonce;
	}

	get style_needs_nonce() {
		return this.csp_provider.style_needs_nonce || this.report_only_provider.style_needs_nonce;
	}

	/** @param {string} content */
	add_script(content) {
		this.csp_provider.add_script(content);
		this.report_only_provider.add_script(content);
	}

	/** @param {string} content */
	add_style(content) {
		this.csp_provider.add_style(content);
		this.report_only_provider.add_style(content);
	}
}
