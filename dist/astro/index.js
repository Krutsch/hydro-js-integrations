import hydroJS from "../vite.js";
export default function ({ renderer, } = {}) {
    return {
        name: "astro-hydro-js",
        hooks: {
            "astro:config:setup": async ({ addRenderer, updateConfig }) => {
                addRenderer({
                    name: "hydro-js",
                    clientEntrypoint: "hydro-js-integrations/astro/client.js",
                    serverEntrypoint: "hydro-js-integrations/astro/server.js",
                });
                updateConfig({
                    vite: {
                        plugins: [hydroJS({ renderer })],
                    },
                });
            },
            "astro:config:done": ({ logger, config }) => {
                const knownJsxRenderers = [
                    "@astrojs/react",
                    "@astrojs/preact",
                    "@astrojs/solid-js",
                ];
                const enabledKnownJsxRenderers = config.integrations.filter((renderer) => knownJsxRenderers.includes(renderer.name));
                if (enabledKnownJsxRenderers.length > 1) {
                    logger.warn("More than one JSX renderer is enabled. This will lead to unexpected behavior for now.");
                }
            },
        },
    };
}
