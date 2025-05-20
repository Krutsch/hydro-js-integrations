import library from "../server";
async function check(Component) {
    const inside = Component.toString();
    return (typeof Component === "string" ||
        (typeof Component === "function" &&
            (inside.includes("h") ||
                inside.includes("html`") ||
                inside.includes("html$"))));
}
async function renderToStaticMarkup(Component, props, { default: children, ...slotted }, metadata) {
    const { setGlobalSchedule, html, render, renderToString } = await library;
    setGlobalSchedule(false);
    const needsHydrate = metadata?.astroStaticSlot ? !!metadata.hydrate : true;
    const tagName = needsHydrate ? "astro-slot" : "astro-static-slot";
    const slots = [];
    for (const [key, value] of Object.entries(slotted)) {
        const name = slotName(key);
        slots.push(html `<${tagName} name="${name}">${value}</${tagName}>`);
    }
    const node = typeof Component === "function"
        ? Component(props, children)
        : html `<${Component} ${props}>${children}</${Component}>`;
    node.append(...slots);
    const wrapper = html `<div>${node}</div>`;
    const unmount = render(wrapper);
    const nodeHTML = renderToString(wrapper);
    unmount();
    return { html: nodeHTML };
}
function slotName(str) {
    return str.trim().replace(/[-_]([a-z])/g, (_, w) => w.toUpperCase());
}
const renderer = {
    name: "hydro-js",
    check,
    renderToStaticMarkup,
    supportsAstroStaticSlot: false,
};
export default renderer;
