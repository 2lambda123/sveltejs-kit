/* src/routes/dynamic-[slug].svelte generated by Svelte v3.29.0 */
import {
	SvelteComponentDev,
	add_location,
	append_dev,
	children,
	claim_element,
	claim_text,
	component_subscribe,
	detach_dev,
	dispatch_dev,
	element,
	init,
	insert_dev,
	noop,
	safe_not_equal,
	set_data_dev,
	text,
	validate_slots,
	validate_store
} from "../../web_modules/svelte/internal.js";

import { page } from "../main/runtime/stores.js";
const file = "src/routes/dynamic-[slug].svelte";

function create_fragment(ctx) {
	let h1;
	let t0;
	let t1_value = /*$page*/ ctx[0].params.slug + "";
	let t1;

	const block = {
		c: function create() {
			h1 = element("h1");
			t0 = text("Slug: ");
			t1 = text(t1_value);
			this.h();
		},
		l: function claim(nodes) {
			h1 = claim_element(nodes, "H1", {});
			var h1_nodes = children(h1);
			t0 = claim_text(h1_nodes, "Slug: ");
			t1 = claim_text(h1_nodes, t1_value);
			h1_nodes.forEach(detach_dev);
			this.h();
		},
		h: function hydrate() {
			add_location(h1, file, 4, 0, 71);
		},
		m: function mount(target, anchor) {
			insert_dev(target, h1, anchor);
			append_dev(h1, t0);
			append_dev(h1, t1);
		},
		p: function update(ctx, [dirty]) {
			if (dirty & /*$page*/ 1 && t1_value !== (t1_value = /*$page*/ ctx[0].params.slug + "")) set_data_dev(t1, t1_value);
		},
		i: noop,
		o: noop,
		d: function destroy(detaching) {
			if (detaching) detach_dev(h1);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_fragment.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

function instance($$self, $$props, $$invalidate) {
	let $page;
	validate_store(page, "page");
	component_subscribe($$self, page, $$value => $$invalidate(0, $page = $$value));
	let { $$slots: slots = {}, $$scope } = $$props;
	validate_slots("Dynamic_u5Bslugu5D", slots, []);
	const writable_props = [];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Dynamic_u5Bslugu5D> was created with unknown prop '${key}'`);
	});

	$$self.$capture_state = () => ({ page, $page });
	return [$page];
}

class Dynamic_u5Bslugu5D extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, instance, create_fragment, safe_not_equal, {});

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "Dynamic_u5Bslugu5D",
			options,
			id: create_fragment.name
		});
	}
}

export default Dynamic_u5Bslugu5D;
//# sourceMappingURL=dynamic-[slug].js.map
