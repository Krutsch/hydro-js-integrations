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

  it("transforms when another plugin prepends code before the JSX token", () => {
    const output = transform(
      hydroJS(),
      `import "./setup";\n${JSX_TOKEN}\nexport const view = <div />;`,
    );

    expect(output).toContain('import { h } from "hydro-js";');
    expect(output).not.toContain(JSX_TOKEN);
  });
});
