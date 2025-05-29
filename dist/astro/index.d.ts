import type { getRenderer } from "../server.js";
import type { AstroIntegration } from "astro";
export default function hydroJS({ renderer, }?: {
    renderer?: ReturnType<typeof getRenderer>;
}): AstroIntegration;
