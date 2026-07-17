import { describe, expect, it } from "vitest";
import { version } from "vite";
import hydroJS from "../src/vite";

const JSX_TOKEN = "/*Add JSX*/;";

function transform(
  plugin: ReturnType<typeof hydroJS>,
  code: string,
  options?: { ssr?: boolean },
) {
  return plugin.transform(code, "component.tsx", options) as string | undefined;
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

  it("replaces the injected token with a client-side hydro-js import", () => {
    const output = transform(
      hydroJS(),
      `${JSX_TOKEN}\nexport const view = <div />;`,
    );

    expect(output).toContain('import { h } from "hydro-js";');
    expect(output).not.toContain(JSX_TOKEN);
  });

  it("replaces the injected token with an SSR getLibrary import", () => {
    const output = transform(
      hydroJS(),
      `${JSX_TOKEN}\nexport const view = <div />;`,
      { ssr: true },
    );

    expect(output).toContain(
      'import { getLibrary } from "hydro-js-integrations/server";',
    );
    expect(output).toContain("const { h } = await getLibrary();");
    expect(output).not.toContain(JSX_TOKEN);
  });

  it("loads static hydro-js imports after initializing the SSR DOM", () => {
    const output = transform(
      hydroJS(),
      `${JSX_TOKEN}\nimport { reactive as signal } from "hydro-js";\nexport const view = <div />;`,
      { ssr: true },
    );

    expect(output).not.toContain('from "hydro-js"');
    expect(output).toContain(
      "const { h, reactive: signal } = await getLibrary();",
    );
  });

  it("does not duplicate an explicit h import in SSR output", () => {
    const output = transform(
      hydroJS(),
      `${JSX_TOKEN}\nimport { h, reactive } from "hydro-js";\nexport const view = <div />;`,
      { ssr: true },
    );

    expect(output).toContain("const { h, reactive } = await getLibrary();");
    expect(output).not.toContain("const { h, h,");
  });

  it("sets the configured renderer before SSR imports hydro-js", () => {
    const output = transform(
      hydroJS({ renderer: "jsdom" }),
      `${JSX_TOKEN}\nexport const view = <div />;`,
      { ssr: true },
    );

    expect(output).toContain(
      'import { getLibrary, setRenderer } from "hydro-js-integrations/server";',
    );
    expect(output).toContain(
      'setRenderer("jsdom");const { h } = await getLibrary();',
    );
  });

  it("augments an existing server integration import instead of duplicating it", () => {
    const output = transform(
      hydroJS({ renderer: "happy-dom" }),
      `${JSX_TOKEN}\nimport { renderToString } from "hydro-js-integrations/server";\nexport const view = <div />;`,
      { ssr: true },
    );

    expect(output).toContain(
      'import { renderToString, getLibrary, setRenderer } from "hydro-js-integrations/server";',
    );
    expect(output).toContain(
      'setRenderer("happy-dom");const { h } = await getLibrary();',
    );
    expect(output).not.toMatch(
      /import \{ getLibrary, setRenderer \} from "hydro-js-integrations\/server"/,
    );
  });

  it("adds callable imports when existing server imports use aliases", () => {
    const output = transform(
      hydroJS({ renderer: "jsdom" }),
      `${JSX_TOKEN}\nimport { getLibrary as loadHydro, setRenderer as chooseRenderer } from "hydro-js-integrations/server";\nexport const view = <div />;`,
      { ssr: true },
    );

    expect(output).toContain(
      "getLibrary as loadHydro, setRenderer as chooseRenderer, getLibrary, setRenderer",
    );
    expect(output).toContain(
      'setRenderer("jsdom");const { h } = await getLibrary();',
    );
  });

  it("merges multiple existing server integration imports", () => {
    const output = transform(
      hydroJS({ renderer: "jsdom" }),
      `${JSX_TOKEN}\nimport { renderToString } from "hydro-js-integrations/server";\nimport { getLibrary } from "hydro-js-integrations/server";\nexport const view = <div />;`,
      { ssr: true },
    );

    expect(output?.match(/from "hydro-js-integrations\/server"/g)).toHaveLength(
      1,
    );
    expect(output).toContain("renderToString, getLibrary, setRenderer");
  });

  it("transforms when another plugin prepends code before the JSX token", () => {
    const output = transform(
      hydroJS(),
      `import "./setup";\n${JSX_TOKEN}\nexport const view = <div />;`,
    );

    expect(output).toContain('import { h } from "hydro-js";');
    expect(output).not.toContain(JSX_TOKEN);
  });
});
