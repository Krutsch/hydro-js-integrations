import type library from "../server";
import type { AstroIntegration } from "astro";
export default function (): AstroIntegration;
declare global {
    var hydroJS: Awaited<typeof library>;
    var hFn: typeof hydroJS.h;
}
