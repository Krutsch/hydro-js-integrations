import type {
  AstroComponentMetadata,
  NamedSSRLoadedRendererValue,
} from "astro";
import { renderToString, getLibrary } from "../server.js";
const { setGlobalSchedule, html, render } = await getLibrary();
setGlobalSchedule(false);

async function check(Component: any) {
  if (typeof Component === "string") return true;
  if (typeof Component !== "function") return false;

  return /\b(?:h\s*\(|html\s*`|html\$)/.test(
    Function.prototype.toString.call(Component),
  );
}

async function renderToStaticMarkup(
  Component: any,
  props: Record<string, any>,
  { default: children, ...slotted }: Record<string, any>,
  metadata?: AstroComponentMetadata,
) {
  const needsHydrate = metadata?.astroStaticSlot ? !!metadata.hydrate : true;
  const tagName = needsHydrate ? "astro-slot" : "astro-static-slot";

  const slots: HTMLSlotElement[] = [];
  for (const [key, value] of Object.entries(slotted)) {
    slots.push(
      html`<${tagName} name="${key}">${value}</${tagName}>` as HTMLSlotElement,
    );
  }

  let node =
    typeof Component === "function"
      ? (Component({
          ...props,
          ...(children ? { children: html`${String(children)}` } : {}),
        }) as ReturnType<typeof html>)
      : html`<${Component} ${props}>${
          children ? String(children) : ""
        }</${Component}>`;
  if (isTextNode(node)) {
    const fragment = document.createDocumentFragment();
    fragment.append(node);
    node = fragment;
  }
  node.append(...slots);

  const wrapper = html`<div>${node}</div>` as HTMLDivElement;
  const unmount = render(wrapper);

  try {
    return { html: renderToString(wrapper) };
  } finally {
    unmount();
  }
}

function isTextNode(node: Node): node is Text {
  return (node as Text).splitText !== undefined;
}

const renderer: NamedSSRLoadedRendererValue = {
  name: "hydro-js",
  check,
  renderToStaticMarkup,
  supportsAstroStaticSlot: true,
};

export default renderer;
