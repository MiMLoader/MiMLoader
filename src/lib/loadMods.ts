import path from 'node:path';
import { zip } from 'compressing';
import * as fs from 'fs-extra';
import { ipc } from '.';
import type { Mod } from '../../types';

export const unpackMods = async () => {
	const packedMods = fs
		.readdirSync(path.join(process.cwd(), 'mods'))
		.filter((file) => file.endsWith('.zip'));
	if (packedMods.length === 0) return;

	console.timeLog('Started', 'Unpacking mods');

	for (const file of packedMods) {
		console.timeLog('Started', `Unpacking ${file}`);
		await zip.uncompress(
			path.join(process.cwd(), 'mods', file),
			path.join(process.cwd(), 'mods', file.replace('.zip', '')),
		);
		if (
			!fs.existsSync(
				path.join(process.cwd(), 'mods', file.replace('.zip', ''), 'mod.json'),
			)
		)
			throw new Error(`Couldn\'t load ${file.replace('.zip', '')}'s mod.json`);

		const modJson = fs.readJsonSync(
			path.join(process.cwd(), 'mods', file.replace('.zip', ''), 'mod.json'),
		);

		if (file.replace('.zip', '') !== modJson.name) {
			fs.copySync(
				path.join(process.cwd(), 'mods', file.replace('.zip', '')),
				path.join(process.cwd(), 'mods', modJson.name),
			);
			fs.removeSync(path.join(process.cwd(), 'mods', file.replace('.zip', '')));
		}

		fs.removeSync(path.join(process.cwd(), 'mods', file));
	}
};

export const preloadModsList: Mod[] = [];

export const compileMods = async () => {
	const mods = fs.readdirSync(path.join(process.cwd(), 'mods'));

	if (mods.length === 0) return;

	const importList = [];
	for (const file of mods) {
		if (file.endsWith('.zip')) continue;
		const modJson = fs.readJsonSync(
			path.join(process.cwd(), 'mods', file, 'mod.json'),
		);

		const preloadPath = path.join(
			process.cwd(),
			'mods',
			modJson.name,
			modJson.preload,
			'',
		);
		modJson.path = preloadPath;

		if (modJson.preload) preloadModsList.push(modJson);

		if (fs.existsSync(path.join(process.cwd(), 'mods', file, 'assets')))
			ipc.hostAssets(modJson.name);

		const priority = modJson.priority;
		if (!priority) throw new Error(`Priority not set for ${modJson.name}`);

		importList.push({ priority, file });
	}

	importList.sort((a, b) => b.priority - a.priority);

	for (const mod of importList) {
		const file = mod.file;
		if (file.endsWith('.zip')) continue;
		const modJson = fs.readJsonSync(
			path.join(process.cwd(), 'mods', file, 'mod.json'),
		);

		const dependencies = modJson.dependencies;
		if (dependencies) {
			for (const dep of dependencies) {
				if (!fs.existsSync(path.join(process.cwd(), 'mods', dep, 'mod.json')))
					throw new Error(
						`Couldn't find dependency ${dep} for ${modJson.name}@${modJson.version} - ${modJson.author}`,
					);
			}
		}

		console.timeLog(
			'Started',
			`Compiling ${modJson.name}@${modJson.version} - ${modJson.author}`,
		);

		if (
			!fs.existsSync(path.join(process.cwd(), 'mods', modJson.name, 'mod.json'))
		)
			throw new Error(`Couldn't load ${file}'s mod.json`);

		const script = fs.readFileSync(
			path.join(process.cwd(), 'mods', modJson.name, modJson.main), // hack to make pkg not transform the path
			'utf-8',
		);

		fs.appendFileSync(
			path.join(process.cwd(), 'mods', 'compiled-mods.js'),
			`// ${modJson.name}@${modJson.version} - ${modJson.author}
${script}

`,
		);
	}
};

export const loadMods = async () => {
	console.timeLog('Started', 'Loading mods');

	fs.removeSync(path.join(process.cwd(), 'mods', 'compiled-mods.js'));

	await unpackMods();
	await compileMods();
};
