import MagicString from 'magic-string';
import { parse } from 'svelte-parse-markup';
import { walk } from 'svelte/compiler';

const IGNORE_FLAG = 'static-img-disable';
const FORCE_FLAG = 'static-img-enable';
const ASSET_PREFIX = '___ASSET___';

// TODO: expose this in vite-imagetools rather than duplicating it
const OPTIMIZABLE = /^[^?]+\.(heic|heif|avif|jpeg|jpg|png|tiff|webp|gif)(\?.*)?$/;

/**
 * @returns {import('svelte/types/compiler/preprocess').PreprocessorGroup}
 */
export function image() {
	return {
		markup({ content, filename }) {
			const s = new MagicString(content);
			const ast = parse(content, { filename });

			// Import path to import name
			// e.g. ./foo.png => ___ASSET___0
			/** @type {Map<string, string>} */
			const imports = new Map();

			/**
			 * @param {import('svelte/types/compiler/interfaces').TemplateNode} node
			 * @param {{ type: string, start: number, end: number, raw: string }} attribute_value
			 */
			function update_element(node, attribute_value) {
				if (attribute_value.type === 'MustacheTag') {
					const src_var_name = content
						.substring(attribute_value.start + 1, attribute_value.end - 1)
						.trim();
					s.update(node.start, node.end, dynamic_img_to_picture(content, node, src_var_name));
					return;
				}

				const url = attribute_value.raw.trim();

				// if it's not a relative reference or Vite alias then skip it
				// TODO: read vite aliases here rather than assuming $
				if (!url.startsWith('./') && !url.startsWith('$')) return;

				let import_name = '';

				if (imports.has(url)) {
					import_name = /** @type {string} */ (imports.get(url));
				} else {
					import_name = ASSET_PREFIX + imports.size;
					imports.set(url, import_name);
				}

				if (OPTIMIZABLE.test(url)) {
					s.update(node.start, node.end, img_to_picture(content, node, import_name));
				} else {
					// e.g. <img src="./foo.svg" /> => <img src="{___ASSET___0}" />
					s.update(attribute_value.start, attribute_value.end, `{${import_name}}`);
				}
			}

			let ignore_next_element = false;
			let force_next_element = false;

			// @ts-ignore
			walk(ast.html, {
				/**
				 * @param {import('svelte/types/compiler/interfaces').TemplateNode} node
				 */
				enter(node) {
					if (node.type === 'Comment') {
						if (node.data.trim() === IGNORE_FLAG) {
							ignore_next_element = true;
						} else if (node.data.trim() === FORCE_FLAG) {
							force_next_element = true;
						}
					} else if (node.type === 'Element') {
						if (ignore_next_element) {
							ignore_next_element = false;
							return;
						}

						// Compare node tag match
						if (node.name === 'img') {
							/**
							 * @param {string} attr
							 */
							function get_attr_value(attr) {
								const attribute = node.attributes.find(
									/** @param {any} v */ (v) => v.type === 'Attribute' && v.name === attr
								);
								if (!attribute) return;

								// Ensure value only consists of one element, and is of type "Text".
								// Which should only match instances of static `foo="bar"` attributes.
								if (
									!force_next_element &&
									(attribute.value.length !== 1 || attribute.value[0].type !== 'Text')
								) {
									return;
								}

								return attribute.value[0];
							}

							const src = get_attr_value('src');
							if (!src) return;
							update_element(node, src);
						}
					}
				}
			});

			// add imports
			if (imports.size) {
				let import_text = '';
				for (const [path, import_name] of imports.entries()) {
					import_text += `import ${import_name} from "${path}";`;
				}
				if (ast.instance) {
					// @ts-ignore
					s.appendLeft(ast.instance.content.start, import_text);
				} else {
					s.append(`<script>${import_text}</script>`);
				}
			}

			return {
				code: s.toString(),
				map: s.generateMap()
			};
		}
	};
}

/**
 * @param {string} content
 * @param {Array<import('svelte/types/compiler/interfaces').BaseDirective | import('svelte/types/compiler/interfaces').Attribute | import('svelte/types/compiler/interfaces').SpreadAttribute>} attributes
 * @param {string} src_var_name
 */
function attributes_to_markdown(content, attributes, src_var_name) {
	const attribute_strings = attributes.map((attribute) => {
		if (attribute.name === 'src') {
			return `src={${src_var_name}.img.src}`;
		}
		return content.substring(attribute.start, attribute.end);
	});

	let has_width = false;
	let has_height = false;
	for (const attribute of attributes) {
		if (attribute.name === 'width') has_width = true;
		if (attribute.name === 'height') has_height = true;
	}
	if (!has_width && !has_height) {
		attribute_strings.push(`width={${src_var_name}.img.w}`);
		attribute_strings.push(`height={${src_var_name}.img.h}`);
	}

	return attribute_strings.join(' ');
}

/**
 * @param {string} content
 * @param {import('svelte/types/compiler/interfaces').TemplateNode} node
 * @param {string} import_name
 */
function img_to_picture(content, node, import_name) {
	return `<picture>
	{#each Object.entries(${import_name}.sources) as [format, images]}
		<source srcset={images.map((i) => \`\${i.src} \${i.w}w\`).join(', ')} type={'image/' + format} />
	{/each}
	<img ${attributes_to_markdown(content, node.attributes, import_name)} />
</picture>`;
}

/**
 * For images like `<img src={manually_imported} />`
 * @param {string} content
 * @param {import('svelte/types/compiler/interfaces').TemplateNode} node
 * @param {string} src_var_name
 */
function dynamic_img_to_picture(content, node, src_var_name) {
	return `{#if typeof ${src_var_name} === 'string'}
	<img ${attributes_to_markdown(content, node.attributes, src_var_name)} />
{:else}
	${img_to_picture(content, node, src_var_name)}
{/if}`;
}
