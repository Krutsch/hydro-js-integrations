import { version } from "vite";
const JSX_TOKEN = "/*Add JSX*/";
const JSX_TOKEN_SEMICOLON = `${JSX_TOKEN};`;
const SERVER_IMPORT = /import\s*\{([^}]*)\}\s*from\s*["']hydro-js-integrations\/server["'];?/g;
const HYDRO_IMPORT = /import\s*\{([^}]*)\}\s*from\s*["']hydro-js["'];?/g;
function addNamedImports(currentImports, requiredImports) {
    const imports = currentImports
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean);
    for (const requiredImport of requiredImports) {
        const hasImport = imports.some((name) => name
            .split(/\s+as\s+/)
            .at(-1)
            ?.trim() === requiredImport);
        if (!hasImport)
            imports.push(requiredImport);
    }
    return imports.join(", ");
}
function getHydroBindings(code) {
    const bindings = new Map([["h", "h"]]);
    code.replace(HYDRO_IMPORT, (_import, imported) => {
        for (const name of imported.split(",").map((name) => name.trim())) {
            if (!name)
                continue;
            const [original, alias] = name.split(/\s+as\s+/);
            const importedName = original.trim();
            const localName = alias?.trim() ?? importedName;
            bindings.set(localName, alias ? `${importedName}: ${localName}` : importedName);
        }
        return _import;
    });
    return Array.from(bindings.values());
}
export default function hydroJS({ renderer } = {}) {
    return {
        name: "hydro-js-plugin",
        config() {
            return Number(version.split(".")[0]) >= 8
                ? {
                    oxc: {
                        jsx: {
                            runtime: "classic",
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
        transform(code, _id, options) {
            if (code.includes(JSX_TOKEN_SEMICOLON)) {
                if (options?.ssr) {
                    const hydroBindings = getHydroBindings(code);
                    const hImport = `\n${renderer ? `setRenderer(${JSON.stringify(renderer)});` : ""}const { ${hydroBindings.join(", ")} } = await getLibrary();\n`;
                    code = code.replace(HYDRO_IMPORT, "");
                    const serverImports = Array.from(code.matchAll(SERVER_IMPORT));
                    if (serverImports.length > 0) {
                        code = code.replace(JSX_TOKEN_SEMICOLON, "");
                        const imports = addNamedImports(serverImports.map((match) => match[1]).join(","), ["getLibrary", ...(renderer ? ["setRenderer"] : [])]);
                        let replacedImport = false;
                        code = code.replace(SERVER_IMPORT, () => {
                            if (replacedImport)
                                return "";
                            replacedImport = true;
                            return `import { ${imports} } from "hydro-js-integrations/server";${hImport}`;
                        });
                    }
                    else {
                        code = code.replace(JSX_TOKEN_SEMICOLON, `import { getLibrary${renderer ? ", setRenderer" : ""} } from "hydro-js-integrations/server";${hImport}`);
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
