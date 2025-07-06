import fs from 'node:fs';
import path from 'node:path';
import type { Mod } from '../../types';

export const installMods = () => {
	const workshopPath = path.join(
		process.cwd(),
		'../../',
		'workshop',
		'content',
		'2776960',
	);
	const mods = fs.readdirSync(workshopPath);
	const subscribedMods: string[] = [];

	for (const mod of mods) {
		const modJson: Mod = JSON.parse(
			fs.readFileSync(path.join(workshopPath, mod, 'mod.json'), 'utf8'),
		);
		subscribedMods.push(modJson.name);
		if (fs.existsSync(path.join('mods', modJson.name))) continue;

		fs.cpSync(path.join(workshopPath, mod), path.join('mods', modJson.name), {
			recursive: true,
		});
	}

	const installedMods = fs.readdirSync('./mods');
	for (const mod of installedMods) {
		if (mod === 'compiled-mods.js' || mod.includes('-dev')) continue;
		if (!subscribedMods.includes(mod)) {
			fs.rmSync(path.join('mods', mod), {
				recursive: true,
			});
		}
	}
};
