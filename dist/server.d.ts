declare const library: Promise<typeof import("hydro-js") & {
    renderRootToString: typeof renderRootToString;
    renderToString: typeof renderToString;
    setDOMRenderer: typeof setDOMRenderer;
    getRenderer: typeof getRenderer;
}>;
declare function setDOMRenderer(engine?: string, options?: never[]): Promise<void>;
declare function renderRootToString(): string;
declare function renderToString(elem: Element): string;
declare function getRenderer(): string;
export default library;
