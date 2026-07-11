import { afterEach, describe, expect, it, vi } from "vitest";

function clearDomGlobals() {
  delete (globalThis as { window?: unknown }).window;
  delete (globalThis as { document?: unknown }).document;
}

async function loadServer() {
  vi.resetModules();
  clearDomGlobals();
  return import("../src/server");
}

afterEach(() => {
  clearDomGlobals();
});

describe("server integration", () => {
  it("initializes happy-dom by default and serializes element contents", async () => {
    const server = await loadServer();
    const hydro = await server.getLibrary();

    expect(server.getRenderer()).toBe("happy-dom");
    expect(hydro.html`Hello`).toBeInstanceOf(window.Text);
    expect(window.navigator.userAgent).toContain("HappyDOM");

    const node = document.createElement("article");
    node.innerHTML = "<h1>Hydro</h1>";

    expect(server.renderToString(node)).toBe("<h1>Hydro</h1>");
  });

  it("serializes document root contents", async () => {
    const server = await loadServer();
    await server.getLibrary();

    document.head.innerHTML = "<title>Hydro</title>";
    document.body.innerHTML = '<main id="app">Ready</main>';

    expect(server.renderRootToString()).toBe(
      '<head><title>Hydro</title></head><body><main id="app">Ready</main></body>',
    );
  });

  it("keeps the current DOM across repeated getLibrary calls", async () => {
    const server = await loadServer();
    await server.getLibrary();

    document.body.innerHTML = '<main id="app">Ready</main>';
    await server.getLibrary();

    expect(document.querySelector("#app")?.textContent).toBe("Ready");
    expect(server.renderRootToString()).toBe(
      '<head></head><body><main id="app">Ready</main></body>',
    );
  });

  it("passes jsdom options through and keeps serialization contract consistent", async () => {
    const server = await loadServer();
    server.setRenderer("jsdom");

    await server.getLibrary([
      '<!doctype html><html><head><title>JSDOM</title></head><body><main id="app">SSR</main></body></html>',
      { url: "https://example.test/page" },
    ]);

    expect(server.getRenderer()).toBe("jsdom");
    expect(window.location.href).toBe("https://example.test/page");
    expect(window.navigator.userAgent).toContain("jsdom");

    const node = document.createElement("section");
    node.innerHTML = "<p>Only children</p>";

    expect(server.renderToString(node)).toBe("<p>Only children</p>");
    expect(server.renderRootToString()).toBe(
      '<head><title>JSDOM</title></head><body><main id="app">SSR</main></body>',
    );
  });

  it("escapes text when serializing with jsdom", async () => {
    const server = await loadServer();
    server.setRenderer("jsdom");
    await server.getLibrary();

    const node = document.createElement("p");
    node.append(document.createTextNode("<script>&"));

    expect(server.renderToString(node)).toBe("&lt;script&gt;&amp;");
  });
});
