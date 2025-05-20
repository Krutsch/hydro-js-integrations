import { Plugin } from "vite";

const JSX_TOKEN = "/*Add JSX*/";
const JSX_TOKEN_SEMICOLON = `${JSX_TOKEN};`;

export default function hydroJS(): Plugin {
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
    transform(code: string, _id: string, options?: { ssr?: boolean }) {
      if (code.startsWith(JSX_TOKEN_SEMICOLON)) {
        if (options?.ssr) {
          const hImport = "\nconst { h } = await library;\n";

          if (code.includes("hydro-js-integrations/server")) {
            code = code.replace(JSX_TOKEN_SEMICOLON, "");
            code = code.replace(
              /from ["']hydro-js-integrations\/server["']/,
              `from "hydro-js-integrations/server";${hImport}`
            );
          } else {
            code = code.replace(
              JSX_TOKEN_SEMICOLON,
              `import library from "hydro-js-integrations/server";${hImport}`
            );
          }
        } else {
          code = code.replace(
            JSX_TOKEN_SEMICOLON,
            'import { h } from "hydro-js";\n'
          );
        }

        return code;
      }
    },
  };
}
