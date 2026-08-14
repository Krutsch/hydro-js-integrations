import type { Window } from "happy-dom";
import type { JSDOM } from "jsdom";
export type Renderer = "happy-dom" | "jsdom";
export type RendererOptions = ConstructorParameters<typeof Window>[0] | ConstructorParameters<typeof JSDOM>;
export type RendererWindow = typeof globalThis.window;
export type RendererSession = {
    window: RendererWindow;
    ready: Promise<void>;
};
export declare function createRenderer(renderer: Renderer, options?: RendererOptions): Promise<RendererSession>;
