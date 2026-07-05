import { Window } from "happy-dom";
import { JSDOM } from "jsdom";

type Renderer = "happy-dom" | "jsdom";

let renderer: Renderer = "happy-dom";
let activeRenderer: Renderer | undefined;

async function getLibrary(
  options?: options,
): Promise<typeof import("hydro-js")> {
  await setRendererInternal(renderer, options);
  return import("hydro-js");
}
async function setRendererInternal(engine = renderer, options?: options) {
  if (
    activeRenderer === engine &&
    options === undefined &&
    "window" in globalThis &&
    "document" in globalThis
  ) {
    return;
  }

  const rendererOptions = options ?? (engine === "happy-dom" ? {} : []);
  let window;
  if (engine === "happy-dom") {
    window = new Window(
      rendererOptions as ConstructorParameters<typeof Window>[0],
    );
    window.document.write("");
    await window.happyDOM.waitUntilComplete();
  } else if (engine === "jsdom") {
    window = new JSDOM(
      ...(rendererOptions as ConstructorParameters<typeof JSDOM>),
    ).window;
  }

  if (!window) throw new Error(`Unsupported renderer: ${engine}`);

  renderer = engine;
  activeRenderer = engine;

  Object.assign(globalThis, {
    window,
    document: window.document,
  });
}

function renderRootToString() {
  return (
    document.documentElement.getHTML?.({
      serializableShadowRoots: true,
    }) ?? serializeChildren(document.documentElement)
  );
}
function renderToString(elem: Element) {
  return (
    elem.getHTML?.({
      serializableShadowRoots: true,
    }) ?? serializeChildren(elem)
  );
}

function serializeChildren(node: ParentNode) {
  return Array.from(node.childNodes, serializeNode).join("");
}

function serializeNode(node: ChildNode) {
  if (node instanceof window.Element) return node.outerHTML;
  if (node instanceof window.Text) return node.textContent ?? "";
  if (node instanceof window.Comment) return `<!--${node.textContent ?? ""}-->`;
  return new window.XMLSerializer().serializeToString(node);
}

function setRenderer(newRenderer: Renderer) {
  renderer = newRenderer;
}
function getRenderer() {
  return renderer;
}

export {
  renderRootToString,
  renderToString,
  setRenderer,
  getRenderer,
  getLibrary,
};

type options =
  | ConstructorParameters<typeof Window>[0]
  | ConstructorParameters<typeof JSDOM>;
