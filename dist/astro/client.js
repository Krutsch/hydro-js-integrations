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
    const node = typeof Component === "function"
        ? Component({
            ...props,
            ...(children ? { children: html `${String(children)}` } : {}),
        })
        : html `<${Component} ${props}>${children ? String(children) : ""}</${Component}>`;
    node.append(...slots);
    let unmount;
    if (place) {
        unmount = render(node, place);
    }
    else {
        const span = document.createElement("span");
        span.style.display = "contents";
        const children = Array.from(element.childNodes);
        element.appendChild(span);
        span.append(...children);
        unmount = render(node, span);
    }
    elementMap.set(element, node);
    element.addEventListener("astro:unmount", () => unmount(), {
        once: true,
    });
};
