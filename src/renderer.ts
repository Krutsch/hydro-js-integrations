import type { Window } from "happy-dom";
import type { JSDOM } from "jsdom";

export type Renderer = "happy-dom" | "jsdom";
export type RendererOptions =
  ConstructorParameters<typeof Window>[0] | ConstructorParameters<typeof JSDOM>;
export type RendererWindow = typeof globalThis.window;

export type RendererSession = {
  window: RendererWindow;
  ready: Promise<void>;
};

type RendererAdapter = {
  create(options?: unknown): Promise<RendererSession>;
};

const adapters: Record<Renderer, RendererAdapter> = {
  "happy-dom": {
    async create(options) {
      const { Window } = await import("happy-dom");
      const window = new Window(
        (options ?? {}) as ConstructorParameters<typeof Window>[0],
      );

      return {
        window: window as unknown as RendererWindow,
        ready: (async () => {
          window.document.write("");
          await window.happyDOM.waitUntilComplete();
        })(),
      };
    },
  },
  jsdom: {
    async create(options) {
      const { JSDOM } = await import("jsdom");
      const window = new JSDOM(
        ...((options ?? []) as ConstructorParameters<typeof JSDOM>),
      ).window;

      return {
        window: window as unknown as RendererWindow,
        ready: Promise.resolve(),
      };
    },
  },
};

export function createRenderer(
  renderer: Renderer,
  options?: RendererOptions,
): Promise<RendererSession> {
  const adapter = adapters[renderer];
  if (!adapter) throw new Error(`Unsupported renderer: ${renderer}`);
  return adapter.create(options);
}
