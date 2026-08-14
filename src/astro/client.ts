import { html, render, h, setReuseElements } from "hydro-js";
import { adaptComponent } from "./adapt.js";
setReuseElements(false);

let elementMap = new WeakMap<HTMLElement, ReturnType<typeof h>>();

export default (element: HTMLElement) =>
  async (
    Component: any,
    props: Record<string, any>,
    { default: children, ...slotted }: Record<string, any>,
  ) => {
    if (!element.hasAttribute("ssr")) return;

    const place = elementMap.get(element);
    const node = adaptComponent({
      Component,
      props,
      children,
      slotted,
      document,
      html,
      createSlot: (name, value) =>
        html`<astro-slot name="${name}"
          >${value}</astro-slot
        >` as HTMLSlotElement,
    });

    let unmount: ReturnType<typeof render>;

    if (place) {
      unmount = render(node, place);
    } else {
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
