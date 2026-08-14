import { withServerDOM } from "../server.js";
import { adaptComponent } from "./adapt.js";
async function check(Component) {
    if (typeof Component === "string")
        return true;
    if (typeof Component !== "function")
        return false;
    return /\b(?:h\s*\(|html\s*`|html\$)/.test(Function.prototype.toString.call(Component));
}
async function renderToStaticMarkup(Component, props, { default: children, ...slotted }, metadata) {
    return withServerDOM({}, ({ document, library, serialize }) => {
        const { html, render } = library;
        const needsHydrate = metadata?.astroStaticSlot ? !!metadata.hydrate : true;
        const tagName = needsHydrate ? "astro-slot" : "astro-static-slot";
        const node = adaptComponent({
            Component,
            props,
            children,
            slotted,
            document,
            html,
            createSlot: (name, value) => html `<${tagName} name="${name}">${value}</${tagName}>`,
        });
        const wrapper = html `<div>${node}</div>`;
        const unmount = render(wrapper);
        try {
            return { html: serialize(wrapper) };
        }
        finally {
            unmount();
        }
    });
}
function isTextNode(node) {
    return node.splitText !== undefined;
}
const renderer = {
    name: "hydro-js",
    check,
    renderToStaticMarkup,
    supportsAstroStaticSlot: true,
};
export default renderer;
