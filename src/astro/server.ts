import type {
  AstroComponentMetadata,
  NamedSSRLoadedRendererValue,
} from "astro";
import { renderToString, getLibrary } from "../server";
const { setGlobalSchedule, html, render } = await getLibrary();
setGlobalSchedule(false);

async function check(Component: any) {
  const inside = Component.toString();
  return (
    typeof Component === "string" ||
    (typeof Component === "function" &&
      (inside.includes("h") ||
        inside.includes("html`") ||
        inside.includes("html$")))
  );
}

async function renderToStaticMarkup(
  Component: any,
  props: Record<string, any>,
  { default: children, ...slotted }: Record<string, any>,
  metadata?: AstroComponentMetadata
) {
  const needsHydrate = metadata?.astroStaticSlot ? !!metadata.hydrate : true;
  const tagName = needsHydrate ? "astro-slot" : "astro-static-slot";

  const slots: HTMLSlotElement[] = [];
  for (const [key, value] of Object.entries(slotted)) {
    const name = slotName(key);
    slots.push(
      html`<${tagName} name="${name}">${value}</${tagName}>` as HTMLSlotElement
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
    const fragment = new DocumentFragment();
    fragment.append(node);
    node = fragment;
  }
  node.append(...slots);

  const wrapper = html`<div>${node}</div>` as HTMLDivElement;
  const unmount = render(wrapper);

  const nodeHTML = renderToString(wrapper);
  unmount();
  return { html: nodeHTML };
}

function slotName(str: string) {
  return str.trim().replace(/[-_]([a-z])/g, (_, w) => w.toUpperCase());
}

function isTextNode(node: Node): node is Text {
  return (node as Text).splitText !== undefined;
}

const renderer: NamedSSRLoadedRendererValue = {
  name: "hydro-js",
  check,
  renderToStaticMarkup,
  supportsAstroStaticSlot: false,
};

export default renderer;
