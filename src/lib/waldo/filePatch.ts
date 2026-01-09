import { exists, readdir } from "node:fs/promises";
import { file, write } from "bun";
// import { type Patch } from "@mimloader/waldo"; // for main branch
import type { Patch } from "waldo"; // for local dev
import { proxyListXHR } from "$lib/mods";

const avalableCustoms: string[] = [
  "customCard01",
  "customCard02",
  "customCard03",
  "customCard04",
  "customCard05",
  "customCard06",
  "customCard07",
  "customCard08",
  "customCard09",
  "customCard10",
  "customCard11",
  "customCard12",
  "customCard13",
  "customCard14",
  "customCard15",
  "customCard16",
  "customCard17",
  "customCard18",
  "customCard19",
  "customCard20",
];

const findIndex = (item: string, data: DataJson) => {
  for (let y = 0; y < data.size[1]; y++) {
    for (let z = 0; z < data.size[2]; z++) {
      if (data.data[0][y][z] === item) {
        return { y, z };
      }
    }
  }
};

export const patch = async ({ type, path, structure, table }: Patch) => {
  const data: DataJson = (await exists(`patched/${path}`))
    ? await file(`patched/${path}`).json()
    : await file(`game/package.nw/${path}`).json();

  proxyListXHR.add(path);

  let index: { y: number; z: number } | undefined;

  if (structure.custom) {
    const customId = avalableCustoms[0];
    if (!customId) throw new Error("All custom card slots have been used.");
    index = findIndex(customId, data);
  } else {
    index = findIndex(structure.name, data);
  }

  if (!index)
    throw new Error(
      `${structure.name} not found. if its a custom card, enable the custom flag.`,
    );

  for (const key in structure) {
    if (key === "name") continue;
    const typeData = data.data[table.get(key)][index.y][index.z];

    data.data[table.get(key)][index.y][index.z] = structure[key];

    console.log("[WALDO]:", "replaced", key, typeData, "with", structure[key]);
  }

  await write(`patched/${path}`, JSON.stringify(data), { createPath: true });
};
