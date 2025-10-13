import type { getRenderer } from "./server";
export default function hydroJS({ renderer, }?: {
    renderer?: ReturnType<typeof getRenderer>;
}): {
    name: string;
    config(): {
        esbuild: {
            jsxFactory: string;
            jsxFragment: string;
            jsxInject: string;
        };
    };
    transform(code: string, _id: string, options?: {
        ssr?: boolean;
    }): string | undefined;
};
