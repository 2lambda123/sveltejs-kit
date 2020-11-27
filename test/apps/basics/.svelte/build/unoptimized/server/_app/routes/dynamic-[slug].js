/* src/routes/dynamic-[slug].svelte generated by Svelte v3.29.0 */
import { create_ssr_component, escape, get_store_value } from "../../web_modules/svelte/internal.js";

import { page } from "../main/runtime/stores.js";

const Dynamic_u5Bslugu5D = create_ssr_component(($$result, $$props, $$bindings, slots) => {
	let $page = get_store_value(page);
	return `<h1>Slug: ${escape($page.params.slug)}</h1>`;
});

export default Dynamic_u5Bslugu5D;
//# sourceMappingURL=dynamic-[slug].js.map
