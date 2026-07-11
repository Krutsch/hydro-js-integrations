import { afterEach, describe, expect, it, vi } from "vitest";

function clearDomGlobals() {
  delete (globalThis as { window?: unknown }).window;
  delete (globalThis as { document?: unknown }).document;
}

async function loadRenderer() {
  vi.resetModules();
  clearDomGlobals();
  return (await import("../src/astro/server")).default;
}

afterEach(() => {
  clearDomGlobals();
});

describe("Astro server renderer", () => {
  it("detects string tags and hydro-like component functions", async () => {
    const renderer = await loadRenderer();

    function HydroComponent() {
      return html`<div></div>`;
    }

    function PlainComponent() {
      return "plain";
    }

    function OtherComponent() {
      return document.createElement("div");
    }

    expect(await renderer.check("article")).toBe(true);
    expect(await renderer.check(HydroComponent)).toBe(true);
    expect(await renderer.check(PlainComponent)).toBe(false);
    expect(await renderer.check(OtherComponent)).toBe(false);
    expect(await renderer.check(null)).toBe(false);
    expect(await renderer.check({})).toBe(false);
  });

  it("renders function components with children and named slots", async () => {
    const renderer = await loadRenderer();

    const result = await renderer.renderToStaticMarkup(
      ({ title, children }: { title: string; children?: Node }) => {
        const section = document.createElement("section");
        section.setAttribute("data-title", title);
        if (children) section.append(children);
        return section;
      },
      { title: "Card" },
      {
        default: "Hello",
        side_bar: "<span>Side</span>",
      },
    );

    expect(result.html).toBe(
      '<section data-title="Card">Hello<astro-slot name="side_bar"><span>Side</span></astro-slot></section>',
    );
  });

  it("renders text-node component results", async () => {
    const renderer = await loadRenderer();

    const result = await renderer.renderToStaticMarkup(
      () => document.createTextNode("Loose text"),
      {},
      {},
    );

    expect(result.html).toBe("Loose text");
  });

  it("uses Astro static slot tags when metadata allows static slots", async () => {
    const renderer = await loadRenderer();

    expect(renderer.supportsAstroStaticSlot).toBe(true);

    const result = await renderer.renderToStaticMarkup(
      () => document.createElement("aside"),
      {},
      { panel: "Static" },
      { astroStaticSlot: true, hydrate: false } as never,
    );

    expect(result.html).toBe(
      '<aside><astro-static-slot name="panel">Static</astro-static-slot></aside>',
    );
  });
});
