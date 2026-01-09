import { exists, mkdir } from "node:fs/promises";
import { platform } from "node:os";
import { parseArgs } from "node:util";
import { spawn, write } from "bun";
import { copyGameFiles } from "$lib/copyGameFiles";
import {
  enableDevtools,
  enableProxy,
  installWaldoPackage,
  legacyRuntimeMods,
} from "$lib/patches";
import { server } from "$lib/server";
import {
  patchWaldo,
  proxyListFetch,
  proxyListXHR,
  recordInstall,
  unpack,
} from "$lib/mods";

console.log("Starting MiMLoader");
console.time("Started");

const { values: args } = parseArgs({
  args: Bun.argv,
  options: {
    cwd: {
      type: "string",
    },
    repatch: {
      type: "boolean",
    },
    dev: {
      type: "boolean",
    },
  },
  strict: true,
  allowPositionals: true,
});

if (args.cwd) process.chdir(args.cwd);
if (!(await exists("game")) || args.repatch) {
  await copyGameFiles();
  await legacyRuntimeMods();
  await enableProxy();
}
if (args.dev) await enableDevtools();
if (!(await exists("mods"))) mkdir("mods");
if (!(await exists("mods.json"))) write("mods.json", JSON.stringify([]));
if (!(await exists("patched"))) mkdir("patched");
await unpack();

await installWaldoPackage();
await patchWaldo();

const executable: Promise<string> = new Promise((resolve) => {
  switch (platform()) {
    case "win32":
      resolve("game/Moonstone Island.exe");
      break;
    case "linux":
      resolve("game/Moonstone Island");
      break;
    case "darwin":
      resolve("game/Moonstone Island.app/Contents/MacOS/nwjs");
      break;
    default:
      throw new Error("Can't detect correct game executable");
  }
});

server.listen(5131);

const proxyListFetchArray = JSON.stringify(Array.from(proxyListFetch));
const proxyListXHRArray = JSON.stringify(Array.from(proxyListXHR));

console.log(proxyListXHRArray);

spawn([await executable], {
  env: {
    ...process.env,
    proxyListFetch: proxyListFetchArray,
    proxyListXHR: proxyListXHRArray,
  },
  onExit: () => process.exit(0),
});

console.timeEnd("Started");
