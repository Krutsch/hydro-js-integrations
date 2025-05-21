import { Plugin } from "vite";
import type { getRenderer } from "./server";
export default function hydroJS({ renderer, }?: {
    renderer?: ReturnType<typeof getRenderer>;
}): Plugin;
