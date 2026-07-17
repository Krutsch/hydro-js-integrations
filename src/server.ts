import { Window } from "happy-dom";
import { JSDOM } from "jsdom";
import { AsyncLocalStorage } from "node:async_hooks";

export type Renderer = "happy-dom" | "jsdom";
export type RendererOptions =
  | ConstructorParameters<typeof Window>[0]
  | ConstructorParameters<typeof JSDOM>;
export type ServerDOMOptions =
  | {
      renderer?: "happy-dom";
      rendererOptions?: ConstructorParameters<typeof Window>[0];
    }
  | {
      renderer: "jsdom";
      rendererOptions?: ConstructorParameters<typeof JSDOM>;
    };
export type ServerDOMContext = {
  window: typeof globalThis.window;
  document: Document;
  library: typeof import("hydro-js");
  serializeRoot: typeof renderRootToString;
  serialize: typeof renderToString;
};

let renderer: Renderer = "happy-dom";
let activeRenderer: Renderer | undefined;
let serverDOMQueue = Promise.resolve();
let serverWindow: typeof globalThis.window | undefined;
let libraryPromise: Promise<typeof import("hydro-js")> | undefined;
const serverDOMSession = new AsyncLocalStorage<{ active: boolean }>();

async function getLibrary(
  options?: RendererOptions,
): Promise<typeof import("hydro-js")> {
  await setRendererInternal(renderer, options);
  return (libraryPromise ??= import("hydro-js"));
}
async function setRendererInternal(
  engine: Renderer = renderer,
  options?: RendererOptions,
) {
  if (serverWindow) {
    if (activeRenderer !== engine || options !== undefined) {
      throw new Error(
        `Server DOM already initialized with ${activeRenderer}; renderer and options cannot change`,
      );
    }
    Object.assign(globalThis, {
      window: serverWindow,
      document: serverWindow.document,
    });
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
  serverWindow = window as unknown as typeof globalThis.window;

  Object.assign(globalThis, {
    window: serverWindow,
    document: serverWindow.document,
  });
}

function withServerDOM<T>(
  options: ServerDOMOptions,
  callback: (context: ServerDOMContext) => T | Promise<T>,
): Promise<T> {
  if (serverDOMSession.getStore()?.active) {
    return Promise.reject(new Error("withServerDOM() cannot be nested"));
  }
  const run = async () => {
    const hadWindow = Object.hasOwn(globalThis, "window");
    const hadDocument = Object.hasOwn(globalThis, "document");
    const previousWindow = globalThis.window;
    const previousDocument = globalThis.document;
    const engine = options.renderer ?? renderer;

    try {
      await setRendererInternal(engine, options.rendererOptions);
      const library = await getLibrary();
      resetServerDOM(library);
      const session = { active: true };
      try {
        return await serverDOMSession.run(session, () =>
          callback({
            window: serverWindow!,
            document: serverWindow!.document,
            library,
            serializeRoot: renderRootToString,
            serialize: renderToString,
          }),
        );
      } finally {
        session.active = false;
      }
    } finally {
      if (libraryPromise) resetServerDOM(await libraryPromise);

      if (hadWindow) globalThis.window = previousWindow;
      else delete (globalThis as { window?: unknown }).window;

      if (hadDocument) globalThis.document = previousDocument;
      else delete (globalThis as { document?: unknown }).document;
    }
  };

  const result = serverDOMQueue.then(run, run);
  serverDOMQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

function resetServerDOM(library: typeof import("hydro-js")) {
  if (!serverWindow) return;
  Object.assign(globalThis, {
    window: serverWindow,
    document: serverWindow.document,
  });
  for (const key of Object.keys(library.hydro)) {
    if (!key.startsWith("hydrot")) library.hydro[key] = null;
  }
  library.setGlobalSchedule(false);
  library.setReuseElements(true);
  library.setInsertDiffing(false);
  library.setShouldSetReactivity(true);
  library.setIgnoreIsConnected(false);
  serverWindow.document.documentElement.innerHTML = "<head></head><body></body>";
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
  return new window.XMLSerializer().serializeToString(node);
}

function setRenderer(newRenderer: Renderer) {
  if (serverWindow && newRenderer !== activeRenderer) {
    throw new Error(`Server DOM renderer is locked to ${activeRenderer}`);
  }
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
  withServerDOM,
};
