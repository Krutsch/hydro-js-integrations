# Integrations Documention

## Getting started  
```sh
npm i hydro-js-integrations
```


## Vite
> vite.config.ts
```js
import hydroJS from "hydro-js-integrations/vite";

...
  plugins: [hydroJS()],
...
```
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
Have a look here for an Integration with Astro: https://github.com/Krutsch/astro-hydro-js

## Server (Deno + Hono example)
- In general is being done via happy-dom preferably or jsdom alternately. Have a look at the src/server.ts file.

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
app.use("*", serveStatic({ root: "/build" })); // Optional: where the static files are
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

Deno.serve({ port: 3000 }, app.fetch);
```
<br>

> ssr.ts
```js
import { renderRootToString, getLibrary } from "hydro-js-integrations/server";
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
export default function Counter({ html, reactive }: typeof import("hydro-js")) {
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
import { Counter } from "@/components/counter";

function ssrRender(html, node) {
  return renderToString(html`<div>${node}</div>`);
}

export default async function Home() {
  const hydro = await getLibrary();

  return (
    <HydroIsland
      component="counter"
      ssrHtml={ssrRender(hydro.html, Counter(hydro))}
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
"hydro-js": "npm:hydro-js@^1.8.14",
"happy-dom": "npm:happy-dom@^20.7.0"
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

  return ssrHtml
    ? <div ref={ref} dangerouslySetInnerHTML={{ __html: ssrHtml }} />
    : <div ref={ref}>Loading...</div>;
}
```

Use it in a route – SSR happens at module level via the helper:
> routes/index.tsx
```jsx
import HydroIsland from "../islands/HydroIsland.tsx";
import { hydro, renderToString } from "../utils/hydro-ssr.ts";
import Counter from "../components/counter.ts";

const counterHtml = renderToString(
  Counter(hydro.html, hydro.reactive),
);

export default function Home() {
  return (
    <HydroIsland component="counter" ssrHtml={counterHtml} />
  );
}
```
Have a look here for an Integration with Fresh: https://github.com/Krutsch/fresh-ssr-hydrojs