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

  it("isolates overlapping server DOM sessions", async () => {
    const server = await loadServer();
    let releaseFirst!: () => void;
    const firstCanFinish = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const order: string[] = [];

    const first = server.withServerDOM(
      {},
      async ({ document, serializeRoot }) => {
        order.push("first:start");
        document.body.innerHTML = '<main id="first">First</main>';
        await firstCanFinish;
        order.push("first:end");
        return serializeRoot();
      },
    );
    const second = server.withServerDOM(
      {},
      async ({ document, serializeRoot }) => {
        order.push("second:start");
        document.body.innerHTML = '<main id="second">Second</main>';
        order.push("second:end");
        return serializeRoot();
      },
    );

    await vi.waitFor(() => expect(order).toEqual(["first:start"]));
    releaseFirst();

    await expect(first).resolves.toContain('<main id="first">First</main>');
    await expect(second).resolves.toContain('<main id="second">Second</main>');
    expect(order).toEqual([
      "first:start",
      "first:end",
      "second:start",
      "second:end",
    ]);
    expect("window" in globalThis).toBe(false);
    expect("document" in globalThis).toBe(false);
  });

  it("reuses the Hydro-bound DOM while resetting document and state", async () => {
    const server = await loadServer();
    let firstWindow: Window;

    await server.withServerDOM({}, ({ window, document, library }) => {
      firstWindow = window;
      library.hydro.requestValue = "first";
      document.body.innerHTML = '<main id="first">First</main>';
    });

    await server.withServerDOM({}, ({ window, document, library }) => {
      expect(window).toBe(firstWindow);
      expect(document.querySelector("#first")).toBeNull();
      expect(library.hydro.requestValue).toBeUndefined();
      const node = library.html`<main id="second">Second</main>`;
      expect(node).toBeInstanceOf(window.HTMLElement);
    });
  });

  it("serializes through the session window held by its context", async () => {
    const server = await loadServer();
    server.setRenderer("jsdom");

    await server.withServerDOM({}, ({ window, document, serialize }) => {
      const node = document.createElement("p");
      node.append(document.createTextNode("Context"));
      const sessionWindow = window;

      globalThis.window = new Proxy(sessionWindow, {
        get(target, property) {
          if (property === "XMLSerializer") {
            return undefined;
          }
          return Reflect.get(target, property);
        },
      });

      expect(serialize(node)).toBe("Context");
    });
  });

  it("locks renderer configuration after initialization", async () => {
    const server = await loadServer();
    await server.withServerDOM({}, () => undefined);

    expect(() => server.setRenderer("jsdom")).toThrow(
      "Server DOM renderer is locked to happy-dom",
    );
    await expect(
      server.withServerDOM({ renderer: "jsdom" }, () => undefined),
    ).rejects.toThrow("Server DOM already initialized with happy-dom");
  });

  it("rejects nested sessions instead of deadlocking", async () => {
    const server = await loadServer();

    await expect(
      server.withServerDOM({}, () => server.withServerDOM({}, () => "nested")),
    ).rejects.toThrow("withServerDOM() cannot be nested");
  });

  it("restores the previous DOM after a server session fails", async () => {
    const server = await loadServer();
    await server.getLibrary();
    const previousWindow = window;
    const previousDocument = document;
    document.body.innerHTML = '<main id="legacy">Legacy</main>';

    await expect(
      server.withServerDOM({}, async ({ document }) => {
        document.body.innerHTML = '<main id="temporary">Temporary</main>';
        throw new Error("render failed");
      }),
    ).rejects.toThrow("render failed");

    expect(window).toBe(previousWindow);
    expect(document).toBe(previousDocument);
    expect(document.querySelector("#legacy")).toBeNull();
    expect(document.querySelector("#temporary")).toBeNull();
  });
});
