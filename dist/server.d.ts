import type { Window } from "happy-dom";
import type { JSDOM } from "jsdom";
export type Renderer = "happy-dom" | "jsdom";
export type RendererOptions = ConstructorParameters<typeof Window>[0] | ConstructorParameters<typeof JSDOM>;
export type ServerDOMOptions = {
    renderer?: "happy-dom";
    rendererOptions?: ConstructorParameters<typeof Window>[0];
} | {
    renderer: "jsdom";
    rendererOptions?: ConstructorParameters<typeof JSDOM>;
};
export type ServerDOMContext = {
    window: typeof globalThis.window;
    document: Document;
    library: typeof import("hydro-js");
    serializeRoot: () => string;
    serialize: (elem: Element) => string;
};
declare function getLibrary(options?: RendererOptions): Promise<typeof import("hydro-js")>;
declare function withServerDOM<T>(options: ServerDOMOptions, callback: (context: ServerDOMContext) => T | Promise<T>): Promise<T>;
declare function renderRootToString(): string;
declare function renderToString(elem: Element): string;
declare function setRenderer(newRenderer: Renderer): void;
declare function getRenderer(): Renderer;
export { renderRootToString, renderToString, setRenderer, getRenderer, getLibrary, withServerDOM, };
