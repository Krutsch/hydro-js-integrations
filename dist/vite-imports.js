import { init, parse } from "es-module-lexer";
export async function parseModuleImports(code) {
    await init;
    const [imports] = parse(code);
    const named = [];
    const unsupported = [];
    for (const specifier of imports) {
        if (specifier.d !== -1 || !specifier.n)
            continue;
        const statement = code.slice(specifier.ss, specifier.se);
        const parsed = parseNamedImport(statement, specifier);
        if (parsed.kind === "named") {
            named.push({
                start: specifier.ss,
                end: withSemicolon(code, specifier.se),
                source: specifier.n,
                bindings: parsed.bindings,
            });
        }
        else {
            unsupported.push({
                start: specifier.ss,
                end: withSemicolon(code, specifier.se),
                source: specifier.n,
                reason: parsed.reason,
                typeOnly: parsed.typeOnly,
            });
        }
    }
    return { named, unsupported };
}
function parseNamedImport(statement, specifier) {
    const beforeSource = statement.slice(0, specifier.s - specifier.ss);
    const cleaned = stripComments(beforeSource);
    const openBrace = cleaned.indexOf("{");
    if (openBrace === -1) {
        const clause = cleaned.slice("import".length).trim();
        const typeOnly = /^type\b/.test(clause);
        const runtimeClause = typeOnly ? clause.slice(4).trim() : clause;
        return {
            kind: "unsupported",
            reason: runtimeClause
                ? runtimeClause.startsWith("*")
                    ? "namespace"
                    : "default"
                : "side-effect",
            typeOnly,
        };
    }
    const closeBrace = findMatchingBrace(cleaned, openBrace);
    if (closeBrace === -1) {
        return { kind: "unsupported", reason: "combined", typeOnly: false };
    }
    const prefix = cleaned.slice("import".length, openBrace).trim();
    const declarationTypeOnly = prefix === "type";
    if (prefix && !declarationTypeOnly) {
        return { kind: "unsupported", reason: "combined", typeOnly: false };
    }
    const bindings = splitSpecifiers(cleaned.slice(openBrace + 1, closeBrace)).map((part) => parseBinding(part, declarationTypeOnly));
    return { kind: "named", bindings };
}
function parseBinding(part, declarationTypeOnly) {
    const value = stripComments(part).trim();
    if (!value)
        throw new Error("Empty import binding");
    const match = value.match(/^(type\s+)?([A-Za-z_$][\w$]*)(?:\s+as\s+([A-Za-z_$][\w$]*))?$/);
    if (!match)
        throw new Error(`Unsupported named import: ${value}`);
    const imported = match[2];
    return {
        imported,
        local: match[3] ?? imported,
        typeOnly: declarationTypeOnly || !!match[1],
    };
}
function splitSpecifiers(value) {
    const parts = [];
    let start = 0;
    let quote;
    let comment;
    for (let index = 0; index < value.length; index++) {
        const char = value[index];
        const next = value[index + 1];
        if (comment === "line") {
            if (char === "\n")
                comment = undefined;
            continue;
        }
        if (comment === "block") {
            if (char === "*" && next === "/") {
                comment = undefined;
                index++;
            }
            continue;
        }
        if (quote) {
            if (char === "\\")
                index++;
            else if (char === quote)
                quote = undefined;
            continue;
        }
        if (char === "/" && next === "/") {
            comment = "line";
            index++;
        }
        else if (char === "/" && next === "*") {
            comment = "block";
            index++;
        }
        else if (char === "'" || char === '"' || char === "`") {
            quote = char;
        }
        else if (char === ",") {
            parts.push(value.slice(start, index));
            start = index + 1;
        }
    }
    parts.push(value.slice(start));
    return parts.filter((part) => stripComments(part).trim());
}
function findMatchingBrace(value, openBrace) {
    let quote;
    let comment;
    let depth = 0;
    for (let index = openBrace; index < value.length; index++) {
        const char = value[index];
        const next = value[index + 1];
        if (comment === "line") {
            if (char === "\n")
                comment = undefined;
            continue;
        }
        if (comment === "block") {
            if (char === "*" && next === "/") {
                comment = undefined;
                index++;
            }
            continue;
        }
        if (quote) {
            if (char === "\\")
                index++;
            else if (char === quote)
                quote = undefined;
            continue;
        }
        if (char === "/" && next === "/") {
            comment = "line";
            index++;
        }
        else if (char === "/" && next === "*") {
            comment = "block";
            index++;
        }
        else if (char === "'" || char === '"' || char === "`") {
            quote = char;
        }
        else if (char === "{") {
            depth++;
        }
        else if (char === "}" && --depth === 0) {
            return index;
        }
    }
    return -1;
}
function stripComments(value) {
    return value.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\r\n]*/g, " ");
}
function withSemicolon(code, end) {
    return code[end] === ";" ? end + 1 : end;
}
