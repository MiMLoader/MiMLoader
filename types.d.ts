export interface Mod {
    name: string;
    description: string;
    author: string;
    version: string;
    homepage: string;
    preload: string;
    main: string;
    module: boolean;
    dependencies: string[];
    priority: number;
    path?: string;
}