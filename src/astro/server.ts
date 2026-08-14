import type {
  AstroComponentMetadata,
  NamedSSRLoadedRendererValue,
} from "astro";
import { withServerDOM } from "../server.js";
import { adaptComponent } from "./adapt.js";

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
  return withServerDOM({}, ({ document, library, serialize }) => {
    const { html, render } = library;
    const needsHydrate = metadata?.astroStaticSlot ? !!metadata.hydrate : true;
    const tagName = needsHydrate ? "astro-slot" : "astro-static-slot";
    const node = adaptComponent({
      Component,
      props,
      children,
      slotted,
      document,
      html,
      createSlot: (name, value) =>
        html`<${tagName} name="${name}">${value}</${tagName}>` as HTMLSlotElement,
    });

    const wrapper = html`<div>${node}</div>` as HTMLDivElement;
    const unmount = render(wrapper);

    try {
      return { html: serialize(wrapper) };
    } finally {
      unmount();
    }
  });
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
