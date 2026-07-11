import type { Renderer } from "../server.js";
import type { AstroIntegration } from "astro";
export default function hydroJS({ renderer, }?: {
    renderer?: Renderer;
}): AstroIntegration;
