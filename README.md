# Integrations Documention

## Getting started  
```sh
npm i hydro-js-integrations
```


## Vite
> vite.config.ts
```js
import hydroJsPlugin from "hydro-js-integrations/vite";

...
  plugins: [hydroJsPlugin()],
...
```

## Server (Deno + Hono example)
- In general is being done via happy-dom preferably or jsdom alternately. The Renderer expects a index.html file in the project folder, but the path can be changed when calling the setDOMRenderer.

### Example
> Server file
```js
import type { HtmlEscapedString } from "hono/utils/html";
import { Hono } from "hono";
import { serveStatic } from "hono/deno";
import { renderToReadableStream } from "hono/jsx/streaming";
import { renderRootToString } from "./ssr.ts";

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
import library from "hydro-js-integrations/server";
const { render, $, html, renderRootToString } = await library;

try {
  const decoder = new TextDecoder("utf-8");
  const data = await Deno.readFile("build/index.html");
  render(html`${decoder.decode(data)}`, document.documentElement, false);
  // ...
} catch (err) {
  console.error(err);
}

export { renderRootToString };
```

See here for an Integration with Vite: https://github.com/Krutsch/vite-ssr-hydrojs