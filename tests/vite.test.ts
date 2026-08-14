import { describe, expect, it } from "vitest";
import { version } from "vite";
import hydroJS from "../src/vite";

const JSX_TOKEN = "/*Add JSX*/;";

function transform(
  plugin: ReturnType<typeof hydroJS>,
  code: string,
  options?: { ssr?: boolean },
): Promise<{ code: string; map: unknown } | undefined> {
  return plugin.transform(code, "component.tsx", options) as Promise<
    { code: string; map: unknown } | undefined
  >;
}

describe("vite integration", () => {
  it("configures the JSX runtime for the installed Vite major", () => {
    const config = hydroJS().config();

    if (Number(version.split(".")[0]) >= 8) {
      expect(config).toEqual({
        oxc: {
          jsx: {
            runtime: "classic",
            pragma: "h",
            pragmaFrag: "h",
          },
          jsxInject: "/*Add JSX*/",
        },
      });
    } else {
      expect(config).toEqual({
        esbuild: {
          jsxFactory: "h",
          jsxFragment: "h",
          jsxInject: "/*Add JSX*/",
        },
      });
    }
  });

  it("replaces the injected token with a client-side hydro-js import", async () => {
    const output = await transform(
      hydroJS(),
      `${JSX_TOKEN}\nexport const view = <div />;`,
    );

    expect(output?.code).toContain('import { h } from "hydro-js";');
    expect(output?.code).not.toContain(JSX_TOKEN);
    expect(output?.map).toBeTruthy();
  });

  it("replaces the injected token with an SSR getLibrary import", async () => {
    const output = await transform(
      hydroJS(),
      `${JSX_TOKEN}\nexport const view = <div />;`,
      { ssr: true },
    );

    expect(output?.code).toContain(
      'import { getLibrary } from "hydro-js-integrations/server";',
    );
    expect(output?.code).toContain("const { h } = await getLibrary();");
    expect(output?.code).not.toContain(JSX_TOKEN);
  });

  it("loads static hydro-js imports after initializing the SSR DOM", async () => {
    const output = await transform(
      hydroJS(),
      `${JSX_TOKEN}\nimport { reactive as signal } from "hydro-js";\nexport const view = <div />;`,
      { ssr: true },
    );

    expect(output?.code).not.toContain('from "hydro-js"');
    expect(output?.code).toContain(
      "const { h, reactive: signal } = await getLibrary();",
    );
  });

  it("does not duplicate an explicit h import in SSR output", async () => {
    const output = await transform(
      hydroJS(),
      `${JSX_TOKEN}\nimport { h, reactive } from "hydro-js";\nexport const view = <div />;`,
      { ssr: true },
    );

    expect(output?.code).toContain(
      "const { h, reactive } = await getLibrary();",
    );
    expect(output?.code).not.toContain("const { h, h,");
  });

  it("sets the configured renderer before SSR imports hydro-js", async () => {
    const output = await transform(
      hydroJS({ renderer: "jsdom" }),
      `${JSX_TOKEN}\nexport const view = <div />;`,
      { ssr: true },
    );

    expect(output?.code).toContain(
      'import { getLibrary, setRenderer } from "hydro-js-integrations/server";',
    );
    expect(output?.code).toContain(
      'setRenderer("jsdom");const { h } = await getLibrary();',
    );
  });

  it("augments an existing server integration import instead of duplicating it", async () => {
    const output = await transform(
      hydroJS({ renderer: "happy-dom" }),
      `${JSX_TOKEN}\nimport { renderToString } from "hydro-js-integrations/server";\nexport const view = <div />;`,
      { ssr: true },
    );

    expect(output?.code).toContain(
      'import { renderToString, getLibrary, setRenderer } from "hydro-js-integrations/server";',
    );
    expect(output?.code).toContain(
      'setRenderer("happy-dom");const { h } = await getLibrary();',
    );
    expect(output?.code).not.toMatch(
      /import \{ getLibrary, setRenderer \} from "hydro-js-integrations\/server"/,
    );
  });

  it("preserves and calls aliases from existing server imports", async () => {
    const output = await transform(
      hydroJS({ renderer: "jsdom" }),
      `${JSX_TOKEN}\nimport { getLibrary as loadHydro, setRenderer as chooseRenderer } from "hydro-js-integrations/server";\nexport const view = <div />;`,
      { ssr: true },
    );

    expect(output?.code).toContain(
      "getLibrary as loadHydro, setRenderer as chooseRenderer",
    );
    expect(output?.code).toContain(
      'chooseRenderer("jsdom");const { h } = await loadHydro();',
    );
  });

  it("merges multiple existing server integration imports", async () => {
    const output = await transform(
      hydroJS({ renderer: "jsdom" }),
      `${JSX_TOKEN}\nimport { renderToString } from "hydro-js-integrations/server";\nimport { getLibrary } from "hydro-js-integrations/server";\nexport const view = <div />;`,
      { ssr: true },
    );

    expect(
      output?.code.match(/from "hydro-js-integrations\/server"/g),
    ).toHaveLength(1);
    expect(output?.code).toContain("renderToString, getLibrary, setRenderer");
  });

  it("transforms when another plugin prepends code before the JSX token", async () => {
    const output = await transform(
      hydroJS(),
      `import "./setup";\n${JSX_TOKEN}\nexport const view = <div />;`,
    );

    expect(output?.code).toContain('import { h } from "hydro-js";');
    expect(output?.code).not.toContain(JSX_TOKEN);
  });

  it("handles multiline imports and comments", async () => {
    const output = await transform(
      hydroJS(),
      `${JSX_TOKEN}
import /* leading */ {
  reactive as signal, // inline
  h,
} from "hydro-js";
export const view = <div />;`,
      { ssr: true },
    );

    expect(output?.code).toContain(
      "const { h, reactive: signal } = await getLibrary();",
    );
    expect(output?.code).not.toContain('from "hydro-js"');
  });

  it("rejects unsupported runtime hydro-js import forms", async () => {
    await expect(
      transform(
        hydroJS(),
        `${JSX_TOKEN}
import * as hydro from "hydro-js";
export const view = <div />;`,
        { ssr: true },
      ),
    ).rejects.toThrow("namespace hydro-js import");
  });

  it("preserves type-only hydro-js imports", async () => {
    const output = await transform(
      hydroJS(),
      `${JSX_TOKEN}
import type { SomeType } from "hydro-js";
export const view = <div />;`,
      { ssr: true },
    );

    expect(output?.code).toContain('import { type SomeType } from "hydro-js";');
    expect(output?.code).toContain("const { h } = await getLibrary();");
  });
});
