import { readFile } from "node:fs/promises";
import { Window } from "happy-dom";
import { JSDOM } from "jsdom";

let serializer: XMLSerializer;

const library = new Promise((resolve) =>
  setDOMRenderer().then(() =>
    import("hydro-js").then((lib) => {
      resolve({ ...lib, renderToString, setDOMRenderer, renderRootToString });
    })
  )
) as Promise<
  typeof import("hydro-js") & {
    renderRootToString: typeof renderRootToString;
    renderToString: typeof renderToString;
    setDOMRenderer: typeof setDOMRenderer;
  }
>;
async function setDOMRenderer(engine = "happy-dom", options = []) {
  let window;

  if (engine === "happy-dom") {
    window = new Window(...options);
    window.document.write("");
    await window.happyDOM.waitUntilComplete();
  } else if (engine === "jsdom") {
    window = new JSDOM(...options).window;
    serializer = new window.XMLSerializer();
  }

  // @ts-expect-error
  globalThis.window = window;
  // @ts-expect-error
  globalThis.document = window.document;
}

function renderRootToString() {
  return (
    document.documentElement.getHTML?.({
      serializableShadowRoots: true,
    }) ?? serializer.serializeToString(document)
  );
}
function renderToString(elem: Element | Node) {
  return (
    elem.parentElement?.getHTML?.({
      serializableShadowRoots: true,
    }) ?? serializer.serializeToString(elem)
  );
}

export default library;
