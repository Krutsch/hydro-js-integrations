import { describe, expect, it, vi } from "vitest";
import hydroJS from "../src/astro/index";

describe("Astro integration", () => {
  it("registers the renderer and wires the Vite plugin", async () => {
    const integration = hydroJS({ renderer: "jsdom" });
    const addRenderer = vi.fn();
    const updateConfig = vi.fn();

    await integration.hooks["astro:config:setup"]?.({
      addRenderer,
      updateConfig,
    } as never);

    expect(integration.name).toBe("astro-hydro-js");
    expect(addRenderer).toHaveBeenCalledWith({
      name: "hydro-js",
      clientEntrypoint: "hydro-js-integrations/astro/client.js",
      serverEntrypoint: "hydro-js-integrations/astro/server.js",
    });

    const viteConfig = updateConfig.mock.calls[0][0].vite;
    const plugin = viteConfig.plugins[0];

    expect(plugin.name).toBe("hydro-js-plugin");
    expect(
      plugin.transform(
        "/*Add JSX*/;\nexport const view = <div />;",
        "view.tsx",
        {
          ssr: true,
        },
      ),
    ).toContain('setRenderer("jsdom");const { h } = await getLibrary();');
  });

  it("warns when multiple known JSX renderers are enabled", () => {
    const integration = hydroJS();
    const warn = vi.fn();

    integration.hooks["astro:config:done"]?.({
      logger: { warn },
      config: {
        integrations: [{ name: "@astrojs/react" }, { name: "@astrojs/preact" }],
      },
    } as never);

    expect(warn).toHaveBeenCalledWith(
      "More than one JSX renderer is enabled. This will lead to unexpected behavior for now.",
    );
  });

  it("does not warn when hydro-js is the only JSX renderer", () => {
    const integration = hydroJS();
    const warn = vi.fn();

    integration.hooks["astro:config:done"]?.({
      logger: { warn },
      config: {
        integrations: [{ name: "@astrojs/react" }, { name: "astro-hydro-js" }],
      },
    } as never);

    expect(warn).not.toHaveBeenCalled();
  });
});
