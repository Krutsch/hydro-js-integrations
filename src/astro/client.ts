import { html, render, h, setReuseElements } from "hydro-js";
setReuseElements(false);
globalThis.hFn = h;

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
    // const node = html``
    const node = Component(props, children);
    let unmount: ReturnType<typeof render>;

    if (place) {
      unmount = render(node, place);
    } else {
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
