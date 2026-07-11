import { Window } from "happy-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

declare module "happy-dom" {
  interface Window {
    requestIdleCallback: (
      callback: (deadline: {
        didTimeout: boolean;
        timeRemaining: () => number;
      }) => void,
    ) => number;
  }
}

function clearDomGlobals() {
  for (const key of [
    "window",
    "document",
    "Node",
    "Element",
    "HTMLElement",
    "Text",
    "Comment",
    "Event",
  ]) {
    delete (globalThis as Record<string, unknown>)[key];
  }
}

async function loadHydrator() {
  vi.resetModules();
  clearDomGlobals();

  const domWindow = new Window() as any;
  domWindow.document.write("");
  await domWindow.happyDOM.waitUntilComplete();

  Object.defineProperty(domWindow, "request" + "IdleCallback", {
    value: (
      callback: (deadline: {
        didTimeout: boolean;
        timeRemaining: () => number;
      }) => void,
    ) => {
      callback({ didTimeout: false, timeRemaining: () => 50 });
      return 1;
    },
    writable: true,
  });

  Object.assign(globalThis, {
    window: domWindow,
    document: domWindow.document,
    Node: domWindow.Node,
    Element: domWindow.Element,
    HTMLElement: domWindow.HTMLElement,
    Text: domWindow.Text,
    Comment: domWindow.Comment,
    Event: domWindow.Event,
  });

  return (await import("../src/astro/client")).default;
}

function createComponent(text: string) {
  return () => {
    const section = document.createElement("section");
    section.dataset.client = text;
    section.textContent = text;
    return section;
  };
}

function createHost() {
  const host = document.createElement("astro-island");
  document.body.append(host);
  return host;
}

afterEach(() => {
  clearDomGlobals();
});

describe("Astro client hydrator", () => {
  it("does nothing when the island is not marked as SSR", async () => {
    const createHydrator = await loadHydrator();
    const host = createHost();

    await createHydrator(host)(createComponent("Client"), {}, {});

    expect(host.innerHTML).toBe("");
  });

  it("hydrates SSR islands into a display-contents placeholder", async () => {
    const createHydrator = await loadHydrator();
    const host = createHost();
    host.setAttribute("ssr", "");
    host.innerHTML = "<p>Server</p>";

    await createHydrator(host)(createComponent("Client"), {}, {});

    expect(host.querySelector('[data-client="Client"]')?.textContent).toBe(
      "Client",
    );
  });

  it("passes default children and named slots into client renders", async () => {
    const createHydrator = await loadHydrator();
    const host = createHost();
    host.setAttribute("ssr", "");

    await createHydrator(host)(
      ({ children }: { children?: Node }) => {
        const section = document.createElement("section");
        if (children) section.append(children);
        return section;
      },
      {},
      { default: "Child", toolbar: "Tools" },
    );

    expect(host.querySelector("section")?.textContent).toBe("ChildTools");
    expect(host.querySelector('astro-slot[name="toolbar"]')?.textContent).toBe(
      "Tools",
    );
  });

  it("preserves named slot keys during hydration", async () => {
    const createHydrator = await loadHydrator();
    const host = createHost();
    host.setAttribute("ssr", "");

    await createHydrator(host)(
      createComponent("Client"),
      {},
      {
        side_bar: "Side",
      },
    );

    expect(host.querySelector('astro-slot[name="side_bar"]')?.textContent).toBe(
      "Side",
    );
    expect(host.querySelector('astro-slot[name="sideBar"]')).toBeNull();
  });

  it("reuses the previous render target on repeated hydration", async () => {
    const createHydrator = await loadHydrator();
    const host = createHost();
    host.setAttribute("ssr", "");
    const hydrate = createHydrator(host);

    await hydrate(createComponent("First"), {}, {});
    await hydrate(createComponent("Second"), {}, {});

    expect(host.querySelector('[data-client="First"]')).toBeNull();
    expect(host.querySelector('[data-client="Second"]')?.textContent).toBe(
      "Second",
    );
    expect(host.querySelectorAll("[data-client]")).toHaveLength(1);
  });

  it("unmounts the client render when Astro dispatches astro:unmount", async () => {
    const createHydrator = await loadHydrator();
    const host = createHost();
    host.setAttribute("ssr", "");

    await createHydrator(host)(createComponent("Client"), {}, {});
    host.dispatchEvent(new Event("astro:unmount"));

    expect(host.querySelector('[data-client="Client"]')).toBeNull();
  });
});
