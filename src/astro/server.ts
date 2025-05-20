import type {
  AstroComponentMetadata,
  NamedSSRLoadedRendererValue,
} from "astro";
import library from "../server";

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
  const { setGlobalSchedule, html, render, renderToString } = await library;

  setGlobalSchedule(false);

  const needsHydrate = metadata?.astroStaticSlot ? !!metadata.hydrate : true;
  const tagName = needsHydrate ? "astro-slot" : "astro-static-slot";

  const slots: HTMLSlotElement[] = [];
  for (const [key, value] of Object.entries(slotted)) {
    const name = slotName(key);
    slots.push(
      html`<${tagName} name="${name}">${value}</${tagName}>` as HTMLSlotElement
    );
  }

  const node =
    typeof Component === "function"
      ? Component(props, children)
      : html`<${Component} ${props}>${children}</${Component}>`;
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

const renderer: NamedSSRLoadedRendererValue = {
  name: "hydro-js",
  check,
  renderToStaticMarkup,
  supportsAstroStaticSlot: false,
};

export default renderer;
