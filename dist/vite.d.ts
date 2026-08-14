import type { Renderer } from "./server.js";
export default function hydroJS({ renderer }?: {
    renderer?: Renderer;
}): {
    name: string;
    config(): {
        oxc: {
            jsx: {
                runtime: "classic";
                pragma: string;
                pragmaFrag: string;
            };
            jsxInject: string;
        };
        esbuild?: undefined;
    } | {
        oxc?: undefined;
        esbuild: {
            jsxFactory: string;
            jsxFragment: string;
            jsxInject: string;
        };
    };
    transform(code: string, id: string, options?: {
        ssr?: boolean;
    }): Promise<{
        code: string;
        map: import("magic-string").SourceMap;
    } | undefined>;
};
