declare const library: Promise<typeof import("hydro-js") & {
    renderRootToString: typeof renderRootToString;
    renderToString: typeof renderToString;
    setDOMRenderer: typeof setDOMRenderer;
}>;
declare function setDOMRenderer(engine?: string, options?: never[]): Promise<void>;
declare function renderRootToString(): string;
declare function renderToString(elem: Element | Node): string;
export default library;
