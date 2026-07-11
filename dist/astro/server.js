import { renderToString, getLibrary } from "../server.js";
const { setGlobalSchedule, html, render } = await getLibrary();
setGlobalSchedule(false);
async function check(Component) {
    if (typeof Component === "string")
        return true;
    if (typeof Component !== "function")
        return false;
    return /\b(?:h\s*\(|html\s*`|html\$)/.test(Function.prototype.toString.call(Component));
}
async function renderToStaticMarkup(Component, props, { default: children, ...slotted }, metadata) {
    const needsHydrate = metadata?.astroStaticSlot ? !!metadata.hydrate : true;
    const tagName = needsHydrate ? "astro-slot" : "astro-static-slot";
    const slots = [];
    for (const [key, value] of Object.entries(slotted)) {
        slots.push(html `<${tagName} name="${key}">${value}</${tagName}>`);
    }
    let node = typeof Component === "function"
        ? Component({
            ...props,
            ...(children ? { children: html `${String(children)}` } : {}),
        })
        : html `<${Component} ${props}>${children ? String(children) : ""}</${Component}>`;
    if (isTextNode(node)) {
        const fragment = document.createDocumentFragment();
        fragment.append(node);
        node = fragment;
    }
    node.append(...slots);
    const wrapper = html `<div>${node}</div>`;
    const unmount = render(wrapper);
    try {
        return { html: renderToString(wrapper) };
    }
    finally {
        unmount();
    }
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
