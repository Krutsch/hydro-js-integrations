import type { getRenderer } from "./server";
export default function hydroJS({ renderer, }?: {
    renderer?: ReturnType<typeof getRenderer>;
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
        esbuild: {
            jsxFactory: string;
            jsxFragment: string;
            jsxInject: string;
        };
        oxc?: undefined;
    };
    transform(code: string, _id: string, options?: {
        ssr?: boolean;
    }): string | undefined;
};
