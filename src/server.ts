import { Window } from "happy-dom";
import { JSDOM } from "jsdom";

let serializer: XMLSerializer;
let renderer: "happy-dom" | "jsdom" = "happy-dom";
let library: typeof import("hydro-js");

function getLibrary(): Promise<typeof import("hydro-js")> {
  return new Promise((resolve) =>
    setRendererInternal(renderer).then(() =>
      import("hydro-js").then((lib) => {
        library = lib;
        return resolve(lib);
      })
    )
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
    serializer = new window.XMLSerializer();
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
  const html = library.$("html")!;
  return renderer === "happy-dom"
    ? html.getHTML({
        serializableShadowRoots: true,
      })
    : serializer.serializeToString(html.ownerDocument);
}
function renderToString(elem: Element) {
  return renderer === "happy-dom"
    ? elem.getHTML({
        serializableShadowRoots: true,
      })
    : serializer.serializeToString(elem);
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
