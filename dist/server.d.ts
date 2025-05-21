declare let renderer: "happy-dom" | "jsdom";
declare function getLibrary(): Promise<typeof import("hydro-js")>;
declare function renderRootToString(): string;
declare function renderToString(elem: Element): string;
declare function setRenderer(newRenderer: typeof renderer): void;
declare function getRenderer(): "happy-dom" | "jsdom";
export { renderRootToString, renderToString, setRenderer, getRenderer, getLibrary, };
