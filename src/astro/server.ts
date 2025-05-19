import type {
  AstroComponentMetadata,
  NamedSSRLoadedRendererValue,
} from "astro";
import type library from "../server";

async function check(Component: any) {
  if (typeof Component !== "function") return false;
  const inside = Component.toString();
  return (
    inside.includes("hFn") ||
    inside.includes("html`") ||
    inside.includes("html$")
  );
}

async function renderToStaticMarkup(
  Component: any,
  props: Record<string, any>,
  { default: children, ...slotted }: Record<string, any>,
  metadata?: AstroComponentMetadata
) {
  const { h, setGlobalSchedule, html, render } = globalThis.hydroJS as Awaited<
    typeof library
  >;
  globalThis.hFn = h;

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

  const node = Component(props, children);
  node.append(...slots);

  const wrapper = html`<div>${node}</div>` as HTMLDivElement;
  const unmount = render(wrapper);

  const nodeHTML = hydroJS.renderToString(wrapper);
  unmount();
  return { html: nodeHTML };
}

function slotName(str: string) {
  return str.trim().replace(/[-_]([a-z])/g, (_, w) => w.toUpperCase());
}

const renderer: NamedSSRLoadedRendererValue = {
  name: "hydro-jsx",
  check,
  renderToStaticMarkup,
  supportsAstroStaticSlot: false,
};

export default renderer;
