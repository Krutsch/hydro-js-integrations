import { Window } from "happy-dom";
import { JSDOM } from "jsdom";

let renderer: "happy-dom" | "jsdom" = "happy-dom";

function getLibrary(): Promise<typeof import("hydro-js")> {
  return new Promise((resolve) =>
    setRendererInternal(renderer).then(() => import("hydro-js").then(resolve))
  );
}
async function setRendererInternal(
  engine = renderer,
  options: [ConstructorParameters<typeof JSDOM | typeof Window>] | [] = []
) {
  let window;

  if (engine === "happy-dom") {
    window = new Window(
      ...(options as unknown as ConstructorParameters<typeof Window>)
    );
    window.document.write("");
    await window.happyDOM.waitUntilComplete();
  } else if (engine === "jsdom") {
    window = new JSDOM(
      ...(options as unknown as ConstructorParameters<typeof JSDOM>)
    ).window;
  }

  renderer = engine;

  if (!("window" in globalThis)) {
    // @ts-expect-error
    globalThis.window = window;
    // @ts-expect-error
    globalThis.document = window.document;
  }
}

function renderRootToString() {
  return (
    document.documentElement.getHTML?.({
      serializableShadowRoots: true,
    }) ?? new window.XMLSerializer().serializeToString(document)
  );
}
function renderToString(elem: Element) {
  return (
    elem.getHTML?.({
      serializableShadowRoots: true,
    }) ?? new window.XMLSerializer().serializeToString(elem)
  );
}

function setRenderer(newRenderer: typeof renderer) {
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
