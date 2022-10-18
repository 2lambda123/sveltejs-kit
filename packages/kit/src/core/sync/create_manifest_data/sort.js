import { affects_path } from '../../../utils/routing.js';
import { normalize_route_id } from './index.js';

/**
 * @typedef {{
 *   type: 'static' | 'required' | 'optional' | 'rest';
 *   content: string;
 *   matched: boolean;
 * }} Part
 */

/**
 * @typedef {Part[]} Segment
 */

const EMPTY = { type: 'static', content: '', matched: false };

/** @param {import('types').RouteData[]} routes */
export function sort_routes(routes) {
	/** @type {Map<string, Part[]>} */
	const segment_cache = new Map();

	/** @param {string} segment */
	function get_parts(segment) {
		if (!segment_cache.has(segment)) {
			segment_cache.set(segment, split(segment));
		}

		return segment_cache.get(segment);
	}

	/** @param {string} id */
	function split(id) {
		/** @type {Part[]} */
		const parts = [];

		let i = 0;
		while (i <= id.length) {
			const start = id.indexOf('[', i);
			if (start === -1) {
				parts.push({ type: 'static', content: id.slice(i), matched: false });
				break;
			}

			parts.push({ type: 'static', content: id.slice(i, start), matched: false });

			const type = id[start + 1] === '[' ? 'optional' : id[start + 1] === '.' ? 'rest' : 'required';
			const delimiter = type === 'optional' ? ']]' : ']';
			const end = id.indexOf(delimiter, start);

			if (end === -1) {
				throw new Error(`Invalid route ID ${id}`);
			}

			const content = id.slice(start, (i = end + delimiter.length));

			parts.push({
				type,
				content,
				matched: content.includes('=')
			});
		}

		return parts;
	}

	return routes.sort((route_a, route_b) => {
		const segments_a = split_route_id(route_a.id).map(get_parts);
		const segments_b = split_route_id(route_b.id).map(get_parts);

		for (let i = 0; i < Math.max(segments_a.length, segments_b.length); i += 1) {
			const segment_a = segments_a[i] ?? [EMPTY];
			const segment_b = segments_b[i] ?? [EMPTY];

			// compare two segments
			for (let j = 0; j < Math.max(segment_a.length, segment_b.length); j += 1) {
				const a = segment_a[j];
				const b = segment_b[j];

				// first part of each segment is always static
				// (though it may be the empty string), then
				// it alternates between dynamic and static
				// (i.e. [foo][bar] is disallowed)
				const dynamic = j % 2 === 1;

				if (dynamic) {
					if (!a || !b) {
						const part = a ?? b;
						if (part.type === 'rest' || part.type === 'optional') {
							// special case — `x/[...rest]` outranks `[...rest]/x`.
							const normalized_a = normalize_route_id(route_a.id);
							const normalized_b = normalize_route_id(route_b.id);
							let start = 0;

							// downrank the route with the first [...rest] part
							while (true) {
								const a_index = normalized_a.indexOf('<...', start);
								const b_index = normalized_b.indexOf('<...', start);

								if (a_index !== b_index) {
									if (a_index === -1) return -1;
									if (b_index === -1) return +1;

									return b_index - a_index;
								}

								if (a_index === -1) break;

								start = a_index + 1;
							}
						}

						return a ? +1 : -1;
					}

					// part with matcher outranks one without
					if (a.matched !== b.matched) {
						return a.matched ? -1 : +1;
					}

					if (a.type !== b.type) {
						// [required] outranks [[optional]] or [...rest]
						if (a.type === 'required') return -1;
						if (b.type === 'required') return +1;

						// [[optional]] outranks [...rest]
						if (a.type === 'optional') return -1;
						if (b.type === 'optional') return +1;
					}
				} else if (a.content !== b.content) {
					// shallower path outranks deeper path
					if (a === EMPTY) return -1;
					if (b === EMPTY) return +1;

					return sort_static(a.content, b.content);
				}
			}
		}

		return route_a.id < route_b.id ? +1 : -1;
	});
}

/** @param {string} id */
function split_route_id(id) {
	return (
		id
			// remove all [[optional]]/[...rest] parts unless they're at the very end
			.replace(/\[(\[[^\]]+\]|\.\.\.[^\]]+)\](?!$)/g, '')
			.split('/')
			.filter((segment) => segment !== '' && affects_path(segment))
	);
}

/**
 * Sort two strings lexicographically, except `foobar` outranks `foo`
 * @param {string} a
 * @param {string} b
 */
function sort_static(a, b) {
	if (a === b) return 0;

	for (let i = 0; true; i += 1) {
		const char_a = a[i];
		const char_b = b[i];

		if (char_a !== char_b) {
			if (char_a === undefined) return +1;
			if (char_b === undefined) return -1;
			return char_a < char_b ? -1 : +1;
		}
	}
}
