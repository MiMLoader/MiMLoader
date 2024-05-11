export interface Mod {
    name: string;
    description: string;
    author: string;
    version: string;
    homepage: string;
    preload: string | false;
    main: string;
    dependencies: string[];
    priority: number;
    path?: string;
    tags: string[];
}