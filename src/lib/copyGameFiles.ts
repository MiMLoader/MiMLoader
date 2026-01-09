import { cp, exists, rename, rmdir } from "node:fs/promises";
import { zip } from "compressing";

export const copyGameFiles = async () => {
	if (!(await exists("../Moonstone Island")))
		throw new Error("Original game files not found.");

	if (await exists("game")) await rmdir("game", { recursive: true });

	console.time("Copying original game files");
	await cp("../Moonstone Island", "game", { recursive: true });
	console.timeEnd("Copying original game files");

	console.time("Unpacking game files");
	await rename("game/package.nw", "game/package.raw.nw");
	await zip.uncompress("game/package.raw.nw", "game/package.nw");
	console.timeEnd("Unpacking game files");
};
