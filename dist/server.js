import { AsyncLocalStorage } from "node:async_hooks";
import { createRenderer } from "./renderer.js";
let renderer = "happy-dom";
let activeRenderer;
let serverDOMQueue = Promise.resolve();
let serverWindow;
let libraryPromise;
const serverDOMSession = new AsyncLocalStorage();
async function getLibrary(options) {
    await setRendererInternal(renderer, options);
    return (libraryPromise ??= import("hydro-js"));
}
async function setRendererInternal(engine = renderer, options) {
    if (serverWindow) {
        if (activeRenderer !== engine || options !== undefined) {
            throw new Error(`Server DOM already initialized with ${activeRenderer}; renderer and options cannot change`);
        }
        Object.assign(globalThis, {
            window: serverWindow,
            document: serverWindow.document,
        });
        return;
    }
    const session = await createRenderer(engine, options);
    await session.ready;
    renderer = engine;
    activeRenderer = engine;
    serverWindow = session.window;
    Object.assign(globalThis, {
        window: serverWindow,
        document: serverWindow.document,
    });
}
function withServerDOM(options, callback) {
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
            const sessionWindow = serverWindow;
            try {
                return await serverDOMSession.run(session, () => callback({
                    window: sessionWindow,
                    document: sessionWindow.document,
                    library,
                    serializeRoot: () => serializeRootInWindow(sessionWindow),
                    serialize: (element) => serializeInWindow(element, sessionWindow),
                }));
            }
            finally {
                session.active = false;
            }
        }
        finally {
            if (libraryPromise)
                resetServerDOM(await libraryPromise);
            if (hadWindow)
                globalThis.window = previousWindow;
            else
                delete globalThis.window;
            if (hadDocument)
                globalThis.document = previousDocument;
            else
                delete globalThis.document;
        }
    };
    const result = serverDOMQueue.then(run, run);
    serverDOMQueue = result.then(() => undefined, () => undefined);
    return result;
}
function resetServerDOM(library) {
    if (!serverWindow)
        return;
    Object.assign(globalThis, {
        window: serverWindow,
        document: serverWindow.document,
    });
    for (const key of Object.keys(library.hydro)) {
        if (!key.startsWith("hydrot"))
            library.hydro[key] = null;
    }
    library.setGlobalSchedule(false);
    library.setReuseElements(true);
    library.setInsertDiffing(false);
    library.setShouldSetReactivity(true);
    library.setIgnoreIsConnected(false);
    serverWindow.document.documentElement.innerHTML =
        "<head></head><body></body>";
}
function serializeRootInWindow(serverWindow) {
    return (serverWindow.document.documentElement.getHTML?.({
        serializableShadowRoots: true,
    }) ?? serializeChildren(serverWindow.document.documentElement, serverWindow));
}
function serializeInWindow(elem, serverWindow) {
    return (elem.getHTML?.({
        serializableShadowRoots: true,
    }) ?? serializeChildren(elem, serverWindow));
}
function serializeChildren(node, serverWindow) {
    return Array.from(node.childNodes, (child) => serializeNode(child, serverWindow)).join("");
}
function serializeNode(node, serverWindow) {
    if (node instanceof serverWindow.Element)
        return node.outerHTML;
    return new serverWindow.XMLSerializer().serializeToString(node);
}
function renderRootToString() {
    return serializeRootInWindow(globalThis.window);
}
function renderToString(elem) {
    return serializeInWindow(elem, globalThis.window);
}
function setRenderer(newRenderer) {
    if (serverWindow && newRenderer !== activeRenderer) {
        throw new Error(`Server DOM renderer is locked to ${activeRenderer}`);
    }
    renderer = newRenderer;
}
function getRenderer() {
    return renderer;
}
export { renderRootToString, renderToString, setRenderer, getRenderer, getLibrary, withServerDOM, };
