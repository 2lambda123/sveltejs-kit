/* .svelte/main/generated/root.svelte generated by Svelte v3.29.0 */
import {
	create_ssr_component,
	missing_component,
	validate_component
} from "../../../web_modules/svelte/internal.js";

import { setContext, afterUpdate } from "../../../web_modules/svelte.js";
import { layout, ErrorComponent } from "./manifest.js";

const Root = create_ssr_component(($$result, $$props, $$bindings, slots) => {
	const Layout = layout.default;
	let { status = undefined } = $$props;
	let { error = undefined } = $$props;
	let { stores } = $$props;
	let { segments } = $$props;
	let { level0 } = $$props;
	let { level1 = null } = $$props;
	let { notify } = $$props;
	afterUpdate(notify);
	setContext("__svelte__", stores);
	if ($$props.status === void 0 && $$bindings.status && status !== void 0) $$bindings.status(status);
	if ($$props.error === void 0 && $$bindings.error && error !== void 0) $$bindings.error(error);
	if ($$props.stores === void 0 && $$bindings.stores && stores !== void 0) $$bindings.stores(stores);
	if ($$props.segments === void 0 && $$bindings.segments && segments !== void 0) $$bindings.segments(segments);
	if ($$props.level0 === void 0 && $$bindings.level0 && level0 !== void 0) $$bindings.level0(level0);
	if ($$props.level1 === void 0 && $$bindings.level1 && level1 !== void 0) $$bindings.level1(level1);
	if ($$props.notify === void 0 && $$bindings.notify && notify !== void 0) $$bindings.notify(notify);

	return `


${validate_component(Layout, "Layout").$$render($$result, Object.assign({ segment: segments[0] }, level0.props), {}, {
		default: () => `${error
		? `${validate_component(ErrorComponent, "ErrorComponent").$$render($$result, { status, error }, {}, {})}`
		: `${validate_component(level1.component || missing_component, "svelte:component").$$render($$result, Object.assign(level1.props), {}, {})}`}`
	})}`;
});

export default Root;
//# sourceMappingURL=root.js.map
