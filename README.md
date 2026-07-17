# Integrations Documentation

## Getting started

```sh
npm i hydro-js-integrations
```

This package exposes three integration entry points:

- `hydro-js-integrations/server` for server-side DOM setup and serialization.
- `hydro-js-integrations/vite` for JSX transform setup in Vite.
- `hydro-js-integrations/astro` for Astro renderer registration.

## Development

```sh
npm run test:ci
npm run typecheck
npm run build
```

## Vite

> vite.config.ts

```js
import hydroJS from "hydro-js-integrations/vite";

...
  plugins: [hydroJS()],
...
```

The Vite integration also accepts a server renderer option:

```js
plugins: [hydroJS({ renderer: "jsdom" })];
```

The default renderer is `happy-dom`.

Have a look here for an Integration with Vite: https://github.com/Krutsch/vite-ssr-hydrojs

## Astro

Either start a new project like:

```sh
npm create astro@latest -- --template krutsch/astro-hydro-js
```

or add the changes to the config:

> astro.config.ts

```js
import hydroJS from "hydro-js-integrations/astro";

...
integrations: [hydroJS()],
...
```

You can pass the same renderer option through the Astro integration:

```js
integrations: [hydroJS({ renderer: "jsdom" })];
```

Have a look here for an Integration with Astro: https://github.com/Krutsch/astro-hydro-js

## Server (Deno + Hono example)

- Server rendering uses `happy-dom` by default, or `jsdom` when configured.
- `getLibrary()` initializes the DOM and imports `hydro-js`. Repeated calls reuse the current DOM, so split SSR chunks can call it safely.
- Pass renderer options to the first `getLibrary(options)` call. Renderer configuration is locked after Hydro initializes.
- Use `withServerDOM(options, callback)` for request rendering. It queues overlapping sessions, resets one Hydro-bound DOM between requests, and restores previous globals even when rendering fails.
- `renderRootToString()` serializes the document's `<head>` and `<body>` content.
- `renderToString(element)` serializes an element's child HTML. Wrap content in a container when you need a specific root element in the output.

### Renderer options

```js
import { setRenderer, getLibrary } from "hydro-js-integrations/server";

setRenderer("jsdom");
const { html, render } = await getLibrary([
  "<!doctype html><html><head></head><body></body></html>",
  { url: "https://example.test/" },
]);
```

### Isolated request rendering

```js
import { withServerDOM } from "hydro-js-integrations/server";

const output = await withServerDOM({}, ({ document, library }) => {
  const { html, render } = library;
  render(html`<main>Server content</main>`, document.body, false);
  return document.documentElement.outerHTML;
});
```

`window` and `document` are process globals required by hydro-js. The callback queue prevents concurrent requests from replacing those globals while another render is active. Renderer and renderer options are locked after the first Hydro import because hydro-js caches DOM-bound parsers and selectors. Keep network and database work outside the callback when possible.

### Example

> Server file

```js
import type { HtmlEscapedString } from "hono/utils/html";
import { Hono } from "hono";
import { serveStatic } from "hono/deno";
import { renderToReadableStream } from "hono/jsx/streaming";
import "./ssr.ts";
import { renderRootToString } from "hydro-js-integrations/server";


const app = new Hono();

app.get("/", (c) => {
  const stream = renderToReadableStream(
   ("<!DOCTYPE html>" + renderRootToString()) as HtmlEscapedString
  );

  return c.body(stream, {
    headers: {
      "Content-Type": "text/html; charset=UTF-8",
      "Transfer-Encoding": "chunked",
    },
  });
});
app.use("*", serveStatic({ root: "./build" })); // Optional: where the static files are

Deno.serve({ port: 3000 }, app.fetch);
```

<br>

> ssr.ts

```js
import { getLibrary } from "hydro-js-integrations/server";
const { render, html } = await getLibrary();

try {
  const decoder = new TextDecoder("utf-8");
  const data = await Deno.readFile("build/index.html");
  render(html`${decoder.decode(data)}`, document.documentElement, false);
  // ...
} catch (err) {
  console.error(err);
}
```

## Next.js

Add `happy-dom` and `jsdom` to `serverExternalPackages` in your Next.js config so they stay server-only:

> next.config.ts

```js
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["happy-dom", "jsdom"],
};

export default nextConfig;
```

Create a component – a plain function that receives hydro-js and returns a DOM Element:

> components/counter.ts

```js
export function createCounter({ html, reactive }: typeof import("hydro-js")) {
  const count = reactive(0);

  return html`
    <div>
      <button onclick=${() => count((val) => val + 1)}>
        count is ${count}
      </button>
    </div>
  `;
}
```

Create a generic `"use client"` island wrapper that hydrates any component on the client:

> components/HydroIsland.tsx

```jsx
"use client";

import { useRef, useEffect } from "react";

export default function HydroIsland({ ssrHtml, component }) {
  const ref = useRef(null);

  useEffect(() => {
    async function hydrate() {
      const hydro = await import("hydro-js");
      const factory = (await import(`./${component}`))[
        `create${component[0].toUpperCase() + component.slice(1)}`
      ];

      if (!ref.current) return;

      ref.current.innerHTML = "";
      hydro.render(factory(hydro), ref.current);
    }
    hydrate();
  }, [component]);

  return <div ref={ref} dangerouslySetInnerHTML={{ __html: ssrHtml }} />;
}
```

Use it in a Server Component – SSR happens via `getLibrary()` + `renderToString()`:

> app/page.tsx

```jsx
import HydroIsland from "@/components/HydroIsland";
import { getLibrary, renderToString } from "hydro-js-integrations/server";
import { createCounter } from "@/components/counter";

function ssrRender(html, node) {
  return renderToString(html`<div>${node}</div>`);
}

export default async function Home() {
  const hydro = await getLibrary();

  return (
    <HydroIsland
      component="counter"
      ssrHtml={ssrRender(hydro.html, createCounter(hydro))}
    />
  );
}
```

Have a look here for an Integration with Next.js: https://github.com/Krutsch/next-ssr-hydrojs

## Fresh

Fresh 2.x uses Preact as its renderer, so hydro-js components live inside Preact islands.

Add `hydro-js` and `happy-dom` to your `deno.json` imports and externalize them for SSR:

> deno.json (imports excerpt)

```json
"hydro-js": "npm:hydro-js@^1.9.0",
"happy-dom": "npm:happy-dom@^20.10.6"
```

> vite.config.ts

```js
import { defineConfig } from "vite";
import { fresh } from "@fresh/plugin-vite";

export default defineConfig({
  plugins: [fresh()],
  ssr: {
    external: ["hydro-js", "happy-dom"],
  },
});
```

Create a small SSR helper that initializes happy-dom and re-exports hydro-js:

> utils/hydro-ssr.ts

```js
import { Window } from "happy-dom";

const win = new Window();
win.document.write("");
await win.happyDOM.waitUntilComplete();

globalThis.window = win;
globalThis.document = win.document;

const hydro = await import("hydro-js");

export function renderToString(el) {
  return el.outerHTML;
}

export { hydro };
```

Create a component (same pattern as the other integrations):

> components/counter.ts

```js
export default function Counter(html, reactive) {
  const count = reactive(0);

  return html`
    <div>
      <button onclick=${() => count((val) => val + 1)}>
        count is ${count}
      </button>
    </div>
  `;
}
```

Create a generic Preact island wrapper that hydrates any hydro-js component on the client:

> islands/HydroIsland.tsx

```jsx
import { useEffect, useRef } from "preact/hooks";

async function loadAndCreate(name, hydro) {
  const { html, reactive, ternary } = hydro;
  return (await import(`../components/${name}.ts`))[
    `create${name.charAt(0).toUpperCase() + name.slice(1)}`
  ](html, reactive, ternary);
}

export default function HydroIsland({ component, ssrHtml }) {
  const ref = useRef(null);

  useEffect(() => {
    async function hydrate() {
      const hydro = await import("hydro-js");
      if (!ref.current) return;

      const el = await loadAndCreate(component, hydro);
      ref.current.innerHTML = "";
      hydro.render(el, ref.current);
    }
    hydrate();
  }, [component]);

  return ssrHtml ? (
    <div ref={ref} dangerouslySetInnerHTML={{ __html: ssrHtml }} />
  ) : (
    <div ref={ref}>Loading...</div>
  );
}
```

Use it in a route – SSR happens at module level via the helper:

> routes/index.tsx

```jsx
import HydroIsland from "../islands/HydroIsland.tsx";
import { hydro, renderToString } from "../utils/hydro-ssr.ts";
import Counter from "../components/counter.ts";

const counterHtml = renderToString(Counter(hydro.html, hydro.reactive));

export default function Home() {
  return <HydroIsland component="counter" ssrHtml={counterHtml} />;
}
```

Have a look here for an Integration with Fresh: https://github.com/Krutsch/fresh-ssr-hydrojs
