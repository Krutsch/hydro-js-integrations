export type ImportBinding = {
    imported: string;
    local: string;
    typeOnly: boolean;
};
export type NamedImport = {
    start: number;
    end: number;
    source: string;
    bindings: ImportBinding[];
};
export type UnsupportedImport = {
    start: number;
    end: number;
    source: string;
    reason: "default" | "namespace" | "side-effect" | "combined";
    typeOnly: boolean;
};
export type ModuleImports = {
    named: NamedImport[];
    unsupported: UnsupportedImport[];
};
export declare function parseModuleImports(code: string): Promise<ModuleImports>;
