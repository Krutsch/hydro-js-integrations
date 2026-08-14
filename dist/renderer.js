const adapters = {
    "happy-dom": {
        async create(options) {
            const { Window } = await import("happy-dom");
            const window = new Window((options ?? {}));
            return {
                window: window,
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
            const window = new JSDOM(...(options ?? [])).window;
            return {
                window: window,
                ready: Promise.resolve(),
            };
        },
    },
};
export function createRenderer(renderer, options) {
    const adapter = adapters[renderer];
    if (!adapter)
        throw new Error(`Unsupported renderer: ${renderer}`);
    return adapter.create(options);
}
