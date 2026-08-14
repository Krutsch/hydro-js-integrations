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

export function adaptComponent({
  Component,
  props,
  children,
  slotted,
  document,
  html,
  createSlot,
}: AdaptComponentOptions): Exclude<HydroNode, Text> {
  const slots = Object.entries(slotted).map(([key, value]) =>
    createSlot(key, value),
  );

  let node: HydroNode =
    typeof Component === "function"
      ? (Component({
          ...props,
          ...(children ? { children: html`${String(children)}` } : {}),
        }) as HydroNode)
      : html`<${Component} ${props}>${
          children ? String(children) : ""
        }</${Component}>`;

  if (isTextNode(node)) {
    const fragment = document.createDocumentFragment();
    fragment.append(node);
    node = fragment;
  }

  node.append(...slots);
  return node as Exclude<HydroNode, Text>;
}

function isTextNode(node: HydroNode): node is Text {
  return (node as Text).splitText !== undefined;
}
