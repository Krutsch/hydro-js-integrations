import { init, parse, type ImportSpecifier } from "es-module-lexer";

export type ImportBinding = {
  imported: string;
  local: string;
  typeOnly: boolean;
};

export type NamedImport = {
  start: number;
  end: number;
  source: string;
  bindings: ImportBinding[];
};

export type UnsupportedImport = {
  start: number;
  end: number;
  source: string;
  reason: "default" | "namespace" | "side-effect" | "combined";
  typeOnly: boolean;
};

export type ModuleImports = {
  named: NamedImport[];
  unsupported: UnsupportedImport[];
};

export async function parseModuleImports(code: string): Promise<ModuleImports> {
  await init;
  const [imports] = parse(code);
  const named: NamedImport[] = [];
  const unsupported: UnsupportedImport[] = [];

  for (const specifier of imports) {
    if (specifier.d !== -1 || !specifier.n) continue;

    const statement = code.slice(specifier.ss, specifier.se);
    const parsed = parseNamedImport(statement, specifier);

    if (parsed.kind === "named") {
      named.push({
        start: specifier.ss,
        end: withSemicolon(code, specifier.se),
        source: specifier.n,
        bindings: parsed.bindings,
      });
    } else {
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

type ParsedImport =
  | { kind: "named"; bindings: ImportBinding[] }
  | {
      kind: "unsupported";
      reason: UnsupportedImport["reason"];
      typeOnly: boolean;
    };

function parseNamedImport(
  statement: string,
  specifier: ImportSpecifier,
): ParsedImport {
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

  const bindings = splitSpecifiers(
    cleaned.slice(openBrace + 1, closeBrace),
  ).map((part) => parseBinding(part, declarationTypeOnly));

  return { kind: "named", bindings };
}

function parseBinding(
  part: string,
  declarationTypeOnly: boolean,
): ImportBinding {
  const value = stripComments(part).trim();
  if (!value) throw new Error("Empty import binding");

  const match = value.match(
    /^(type\s+)?([A-Za-z_$][\w$]*)(?:\s+as\s+([A-Za-z_$][\w$]*))?$/,
  );
  if (!match) throw new Error(`Unsupported named import: ${value}`);

  const imported = match[2];
  return {
    imported,
    local: match[3] ?? imported,
    typeOnly: declarationTypeOnly || !!match[1],
  };
}

function splitSpecifiers(value: string): string[] {
  const parts: string[] = [];
  let start = 0;
  let quote: string | undefined;
  let comment: "line" | "block" | undefined;

  for (let index = 0; index < value.length; index++) {
    const char = value[index];
    const next = value[index + 1];

    if (comment === "line") {
      if (char === "\n") comment = undefined;
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
      if (char === "\\") index++;
      else if (char === quote) quote = undefined;
      continue;
    }
    if (char === "/" && next === "/") {
      comment = "line";
      index++;
    } else if (char === "/" && next === "*") {
      comment = "block";
      index++;
    } else if (char === "'" || char === '"' || char === "`") {
      quote = char;
    } else if (char === ",") {
      parts.push(value.slice(start, index));
      start = index + 1;
    }
  }

  parts.push(value.slice(start));
  return parts.filter((part) => stripComments(part).trim());
}

function findMatchingBrace(value: string, openBrace: number): number {
  let quote: string | undefined;
  let comment: "line" | "block" | undefined;
  let depth = 0;

  for (let index = openBrace; index < value.length; index++) {
    const char = value[index];
    const next = value[index + 1];

    if (comment === "line") {
      if (char === "\n") comment = undefined;
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
      if (char === "\\") index++;
      else if (char === quote) quote = undefined;
      continue;
    }
    if (char === "/" && next === "/") {
      comment = "line";
      index++;
    } else if (char === "/" && next === "*") {
      comment = "block";
      index++;
    } else if (char === "'" || char === '"' || char === "`") {
      quote = char;
    } else if (char === "{") {
      depth++;
    } else if (char === "}" && --depth === 0) {
      return index;
    }
  }

  return -1;
}

function stripComments(value: string): string {
  return value.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\r\n]*/g, " ");
}

function withSemicolon(code: string, end: number) {
  return code[end] === ";" ? end + 1 : end;
}
