import { cp, readdir, rm } from "node:fs/promises";
import { file } from "bun";
import { zip } from "compressing";
import { join } from "node:path";
import { patch as patchMod } from "./waldo/filePatch";
import type { Patch } from "waldo";

export const proxyListFetch: Set<string> = new Set([]);
export const proxyListXHR: Set<string> = new Set([]);

export const unpack = async () => {
  const mods = await readdir("./mods");
  for (const mod of mods) {
    if (!mod.endsWith(".zip")) continue;

    await zip.uncompress(`./mods/${mod}`, `./mods/${mod.replace(".zip", "")}`);

    const modJsonFile = file(`./mods/${mod.replace(".zip", "")}/mod.json`);
    if (!(await modJsonFile.exists()))
      throw new Error(`Couldn't load ${mod.replace(".zip", "")}'s mod.json`);

    const modJson: Mod = await modJsonFile.json();

    if (mod.replace(".zip", "") !== modJson.name) {
      await cp(`./mods/${mod.replace(".zip", "")}`, `./mods/${modJson.name}`, {
        recursive: true,
      });

      Promise.all([
        rm(`./mods/${mod.replace(".zip", "")}`, { recursive: true }),
        rm(`./mods/${mod}`),
      ]);
    }
  }
};

const isMod = (value: string) => {
  if (value === "node_modules") return false;
  if (value === "bun.lock") return false;
  if (value === "package.json") return false;
  return true;
};

export const patchWaldo = async () => {
  const mods = (await readdir("./mods")).filter((mod) => isMod(mod));
  for (const mod of mods) {
    const modJson: Mod = await file(`./mods/${mod}/mod.json`).json();
    if (!modJson.waldo) continue;
    const patches = await readdir(`./mods/${mod}/waldo`);
    for (const patchFile of patches) {
      const module = await import(
        join(process.cwd(), "mods", mod, "waldo", patchFile)
      );
      const patch: Patch = module.default;
      await patchMod(patch);
    }
  }
};
