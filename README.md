# Integrations Documention


## Server
- This is being done via happy-dom preferably or jsdom alternately. The Renderer expects a index.html file in the project folder, but the path can be changed when calling the setDOMRenderer.

### Example
```js
import library from "hydro-js/server";
const { render, renderRootToString, renderToString, setDOMRenderer } = await library;

import App from "./App.ts";
render(App(), $("#app")); // be aware that you have to render again, if you change the DOMRenderer

const html = renderRootToString();
```
See here for an Integration with Vite: https://github.com/Krutsch/vite-ssr-hydrojs

## Vite
