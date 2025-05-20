import { html, render, setReuseElements } from "hydro-js";
setReuseElements(false);
let elementMap = new WeakMap();
export default (element) => async (Component, props, { default: children, ...slotted }) => {
    if (!element.hasAttribute("ssr"))
        return;
    const slots = [];
    for (const [key, value] of Object.entries(slotted)) {
        let elem;
        if (key === "default") {
            elem = html `<astro-slot>${value}</astro-slot>`;
        }
        else {
            elem = html `<astro-slot name="${key}">${value}</astro-slot>`;
        }
        slots.push(elem);
    }
    const place = elementMap.get(element);
    // const node = html``
    const node = Component(props, children);
    let unmount;
    if (place) {
        unmount = render(node, place);
    }
    else {
        const template = document.createElement("template");
        const children = Array.from(element.childNodes);
        element.insertBefore(template, null);
        template.append(...children);
        unmount = render(node, template);
    }
    elementMap.set(element, node);
    element.addEventListener("astro:unmount", () => unmount(), {
        once: true,
    });
};
