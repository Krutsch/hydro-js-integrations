export function adaptComponent({ Component, props, children, slotted, document, html, createSlot, }) {
    const slots = Object.entries(slotted).map(([key, value]) => createSlot(key, value));
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
    return node;
}
function isTextNode(node) {
    return node.splitText !== undefined;
}
