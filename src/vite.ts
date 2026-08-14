import { version } from "vite";
import MagicString from "magic-string";
import type { Renderer } from "./server.js";
import {
  parseModuleImports,
  type ImportBinding,
  type NamedImport,
} from "./vite-imports.js";

const JSX_TOKEN = "/*Add JSX*/";
const JSX_TOKEN_SEMICOLON = `${JSX_TOKEN};`;
function getHydroBindings(imports: NamedImport[]) {
  const bindings = new Map([["h", "h"]]);
  for (const declaration of imports) {
    for (const binding of declaration.bindings) {
      if (binding.typeOnly) continue;
      bindings.set(
        binding.local,
        binding.local === binding.imported
          ? binding.imported
          : `${binding.imported}: ${binding.local}`,
      );
    }
  }
  return Array.from(bindings.values());
}

function findBinding(bindings: ImportBinding[], imported: string) {
  return bindings.find(
    (binding) => !binding.typeOnly && binding.imported === imported,
  )?.local;
}

function addBinding(bindings: ImportBinding[], imported: string, code: string) {
  const usedNames = new Set(bindings.map((binding) => binding.local));
  let local = imported;
  if (usedNames.has(local) || new RegExp(`\\b${local}\\b`).test(code)) {
    local = `__hydro_${imported}`;
    let suffix = 2;
    while (usedNames.has(local) || new RegExp(`\\b${local}\\b`).test(code)) {
      local = `__hydro_${imported}_${suffix++}`;
    }
  }
  bindings.push({ imported, local, typeOnly: false });
  return local;
}

function renderBinding(binding: ImportBinding) {
  const bindingText =
    binding.local === binding.imported
      ? binding.imported
      : `${binding.imported} as ${binding.local}`;
  return binding.typeOnly ? `type ${bindingText}` : bindingText;
}

function renderImport(bindings: ImportBinding[], source: string) {
  return `import { ${bindings.map(renderBinding).join(", ")} } from "${source}";`;
}

function removeRuntimeImport(magic: MagicString, declaration: NamedImport) {
  if (declaration.bindings.some((binding) => binding.typeOnly)) {
    const typeBindings = declaration.bindings.filter(
      (binding) => binding.typeOnly,
    );
    magic.overwrite(
      declaration.start,
      declaration.end,
      renderImport(typeBindings, declaration.source),
    );
  } else {
    magic.remove(declaration.start, declaration.end);
  }
}

function transformResult(magic: MagicString, id: string) {
  return {
    code: magic.toString(),
    map: magic.generateMap({ hires: true, source: id, includeContent: true }),
  };
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
    async transform(code: string, id: string, options?: { ssr?: boolean }) {
      const tokenStart = code.indexOf(JSX_TOKEN_SEMICOLON);
      if (tokenStart !== -1) {
        const magic = new MagicString(code, { filename: id });
        if (options?.ssr) {
          const imports = await parseModuleImports(code);
          const hydroImports = imports.named.filter(
            (declaration) => declaration.source === "hydro-js",
          );
          const unsupportedHydroImports = imports.unsupported.filter(
            (declaration) =>
              declaration.source === "hydro-js" && !declaration.typeOnly,
          );
          if (unsupportedHydroImports.length > 0) {
            const declaration = unsupportedHydroImports[0];
            throw new Error(
              `Cannot rewrite ${declaration.reason} hydro-js import in SSR module ${id}; use named imports`,
            );
          }

          const hydroBindings = getHydroBindings(hydroImports);
          for (const declaration of hydroImports) {
            removeRuntimeImport(magic, declaration);
          }

          const serverImports = imports.named.filter(
            (declaration) =>
              declaration.source === "hydro-js-integrations/server",
          );
          const serverBindings = serverImports.flatMap(
            (declaration) => declaration.bindings,
          );
          const getLibrary =
            findBinding(serverBindings, "getLibrary") ??
            addBinding(serverBindings, "getLibrary", code);
          const setRenderer = renderer
            ? (findBinding(serverBindings, "setRenderer") ??
              addBinding(serverBindings, "setRenderer", code))
            : undefined;

          const hImport = `\n${
            renderer ? `${setRenderer}(${JSON.stringify(renderer)});` : ""
          }const { ${hydroBindings.join(", ")} } = await ${getLibrary}();\n`;
          const serverImport = renderImport(
            dedupeBindings(serverBindings),
            "hydro-js-integrations/server",
          );
          if (serverImports.length > 0) {
            magic.remove(tokenStart, tokenStart + JSX_TOKEN_SEMICOLON.length);
            for (const declaration of serverImports.slice(1)) {
              magic.remove(declaration.start, declaration.end);
            }
            magic.overwrite(
              serverImports[0].start,
              serverImports[0].end,
              `${serverImport};${hImport}`,
            );
          } else {
            magic.overwrite(
              tokenStart,
              tokenStart + JSX_TOKEN_SEMICOLON.length,
              `${serverImport};${hImport}`,
            );
          }
        } else {
          magic.overwrite(
            tokenStart,
            tokenStart + JSX_TOKEN_SEMICOLON.length,
            'import { h } from "hydro-js";\n',
          );
        }

        return transformResult(magic, id);
      }
    },
  };
}

function dedupeBindings(bindings: ImportBinding[]) {
  const seen = new Set<string>();
  return bindings.filter((binding) => {
    const key = `${binding.imported}:${binding.local}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
