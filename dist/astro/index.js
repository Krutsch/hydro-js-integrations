export default function () {
    return {
        name: "astro-hydro-js",
        hooks: {
            "astro:config:setup": async ({ addRenderer, updateConfig, injectScript, }) => {
                injectScript("before-hydration", `globalThis.hydroJS = await import("hydro-js");`);
                injectScript("page-ssr", 'import library from "hydro-js-integrations/server"; globalThis.hydroJS = await library;');
                addRenderer({
                    name: "astro-hydro-js",
                    clientEntrypoint: "hydro-js-integrations/astro/client.js",
                    serverEntrypoint: "hydro-js-integrations/astro/server.js",
                });
                updateConfig({
                    vite: {
                        esbuild: {
                            jsxFactory: "hFn",
                            jsxFragment: "hFn",
                        },
                    },
                });
            },
        },
    };
}
