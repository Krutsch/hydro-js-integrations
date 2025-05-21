import { html, render, h, setReuseElements } from "hydro-js";
setReuseElements(false);

let elementMap = new WeakMap<HTMLElement, ReturnType<typeof h>>();

export default (element: HTMLElement) =>
  async (
    Component: any,
    props: Record<string, any>,
    { default: children, ...slotted }: Record<string, any>
  ) => {
    if (!element.hasAttribute("ssr")) return;

    const slots: HTMLSlotElement[] = [];
    for (const [key, value] of Object.entries(slotted)) {
      let elem;
      if (key === "default") {
        elem = html`<astro-slot>${value}</astro-slot>`;
      } else {
        elem = html`<astro-slot name="${key}">${value}</astro-slot>`;
      }
      slots.push(elem as HTMLSlotElement);
    }

    const place = elementMap.get(element);
    const node =
      typeof Component === "function"
        ? Component({
            ...props,
            ...(children ? { children: html`${String(children)}` } : {}),
          })
        : html`<${Component} ${props}>${
            children ? String(children) : ""
          }</${Component}>`;
    node.append(...slots);

    let unmount: ReturnType<typeof render>;

    if (place) {
      unmount = render(node, place);
    } else {
      const div = document.createElement("span");
      div.style.display = "contents";
      const children = Array.from(element.childNodes);
      element.insertBefore(div, null);
      div.append(...children);
      unmount = render(node, div);
    }

    elementMap.set(element, node);
    element.addEventListener("astro:unmount", () => unmount(), {
      once: true,
    });
  };
