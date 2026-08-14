import type { html as htmlFunction } from "hydro-js";
type HydroHTML = typeof htmlFunction;
type HydroNode = ReturnType<HydroHTML>;
type AdaptComponentOptions = {
    Component: any;
    props: Record<string, any>;
    children: any;
    slotted: Record<string, any>;
    document: Document;
    html: HydroHTML;
    createSlot: (name: string, value: any) => HTMLSlotElement;
};
export declare function adaptComponent({ Component, props, children, slotted, document, html, createSlot, }: AdaptComponentOptions): Exclude<HydroNode, Text>;
export {};
