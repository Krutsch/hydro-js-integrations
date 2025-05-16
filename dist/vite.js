const JSX_TOKEN = "/*Add JSX*/";
const JSX_TOKEN_SEMICOLON = `${JSX_TOKEN};`;
export default function HYDROJS_PLUGIN() {
    return {
        name: "hydro-js-plugin",
        config() {
            return {
                esbuild: {
                    jsxFactory: "h",
                    jsxFragment: "h",
                    jsxInject: JSX_TOKEN,
                },
            };
        },
        transform(code, _id, options) {
            if (code.startsWith(JSX_TOKEN_SEMICOLON)) {
                if (options?.ssr) {
                    const hImport = "\nconst { h } = await library;\n";
                    if (code.includes("hydro-js/server")) {
                        code = code.replace(JSX_TOKEN_SEMICOLON, "");
                        code = code.replace(/from ["']hydro-js\/server["']/, `from "hydro-js/server";${hImport}`);
                    }
                    else {
                        code = code.replace(JSX_TOKEN_SEMICOLON, `import library from "hydro-js/server";${hImport}`);
                    }
                }
                else {
                    code = code.replace(JSX_TOKEN_SEMICOLON, 'import { h } from "hydro-js";\n');
                }
                return code;
            }
        },
    };
}
