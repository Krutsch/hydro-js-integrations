import { Window } from "happy-dom";
import { JSDOM } from "jsdom";
let serializer;
let renderer = "happy-dom";
const library = new Promise((resolve) => setDOMRenderer().then(() => import("hydro-js").then((lib) => {
    resolve({
        ...lib,
        renderToString,
        setDOMRenderer,
        renderRootToString,
        getRenderer,
    });
})));
async function setDOMRenderer(engine = renderer, options = []) {
    let window;
    if (engine === "happy-dom") {
        window = new Window(...options);
        window.document.write("");
        await window.happyDOM.waitUntilComplete();
    }
    else if (engine === "jsdom") {
        window = new JSDOM(...options).window;
        serializer = new window.XMLSerializer();
    }
    renderer = engine;
    // @ts-expect-error
    globalThis.window = window;
    // @ts-expect-error
    globalThis.document = window.document;
}
function renderRootToString() {
    return (document.documentElement.getHTML?.({
        serializableShadowRoots: true,
    }) ?? serializer.serializeToString(document));
}
function renderToString(elem) {
    return (elem.getHTML?.({
        serializableShadowRoots: true,
    }) ?? serializer.serializeToString(elem));
}
function getRenderer() {
    return renderer;
}
export default library;
