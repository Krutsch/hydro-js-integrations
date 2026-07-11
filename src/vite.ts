import { version } from "vite";
import type { Renderer } from "./server.js";

const JSX_TOKEN = "/*Add JSX*/";
const JSX_TOKEN_SEMICOLON = `${JSX_TOKEN};`;
const SERVER_IMPORT =
  /import\s*\{([^}]*)\}\s*from\s*["']hydro-js-integrations\/server["'];?/g;

function addNamedImports(currentImports: string, requiredImports: string[]) {
  const imports = currentImports
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);

  for (const requiredImport of requiredImports) {
    const hasImport = imports.some(
      (name) =>
        name
          .split(/\s+as\s+/)
          .at(-1)
          ?.trim() === requiredImport,
    );
    if (!hasImport) imports.push(requiredImport);
  }

  return imports.join(", ");
}

export default function hydroJS({ renderer }: { renderer?: Renderer } = {}) {
  return {
    name: "hydro-js-plugin",
    config() {
      return Number(version.split(".")[0]) >= 8
        ? {
            oxc: {
              jsx: {
                runtime: "classic" as const,
                pragma: "h",
                pragmaFrag: "h",
              },
              jsxInject: JSX_TOKEN,
            },
          }
        : {
            esbuild: {
              jsxFactory: "h",
              jsxFragment: "h",
              jsxInject: JSX_TOKEN,
            },
          };
    },
    transform(code: string, _id: string, options?: { ssr?: boolean }) {
      if (code.includes(JSX_TOKEN_SEMICOLON)) {
        if (options?.ssr) {
          const hImport = `\n${
            renderer ? `setRenderer(${JSON.stringify(renderer)});` : ""
          }const { h } = await getLibrary();\n`;

          const serverImports = Array.from(code.matchAll(SERVER_IMPORT));
          if (serverImports.length > 0) {
            code = code.replace(JSX_TOKEN_SEMICOLON, "");
            const imports = addNamedImports(
              serverImports.map((match) => match[1]).join(","),
              ["getLibrary", ...(renderer ? ["setRenderer"] : [])],
            );
            let replacedImport = false;
            code = code.replace(SERVER_IMPORT, () => {
              if (replacedImport) return "";
              replacedImport = true;
              return `import { ${imports} } from "hydro-js-integrations/server";${hImport}`;
            });
          } else {
            code = code.replace(
              JSX_TOKEN_SEMICOLON,
              `import { getLibrary${
                renderer ? ", setRenderer" : ""
              } } from "hydro-js-integrations/server";${hImport}`,
            );
          }
        } else {
          code = code.replace(
            JSX_TOKEN_SEMICOLON,
            'import { h } from "hydro-js";\n',
          );
        }

        return code;
      }
    },
  };
}
