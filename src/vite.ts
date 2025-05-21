import { Plugin } from "vite";
import type { getRenderer } from "./server";

const JSX_TOKEN = "/*Add JSX*/";
const JSX_TOKEN_SEMICOLON = `${JSX_TOKEN};`;

export default function hydroJS({
  renderer,
}: { renderer?: ReturnType<typeof getRenderer> } = {}): Plugin {
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
          const hImport = `\n${
            renderer ? `setRenderer("${renderer}")` : ""
          };const { h } = await getLibrary();\n`;

          if (code.includes("hydro-js-integrations/server")) {
            code = code.replace(JSX_TOKEN_SEMICOLON, "");
            code = code.replace(
              /}\s*from\s*["']hydro-js-integrations\/server["']/,
              `${
                renderer ? ", setRenderer" : ""
              } } from "hydro-js-integrations/server";${hImport}`
            );
          } else {
            code = code.replace(
              JSX_TOKEN_SEMICOLON,
              `import { getLibrary${
                renderer ? ", setRenderer" : ""
              } } from "hydro-js-integrations/server";${hImport}`
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
