import path from 'node:path';
import { build } from 'bun';
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
		const modJson: Mod = fs.readJsonSync(
			path.join(process.cwd(), 'mods', file, 'mod.json'),
		);

		if (modJson.preload) {
			const preloadPath = path.join(
				process.cwd(),
				'mods',
				modJson.name,
				modJson.preload,
			);
			modJson.path = preloadPath;

			preloadModsList.push(modJson);
		}

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
		const modJson: Mod = fs.readJsonSync(
			path.join(process.cwd(), 'mods', file, 'mod.json'),
		);

		const dependencies: string[] = modJson.dependencies;
		if (dependencies) {
			for (const dep of dependencies) {
				const dependency = {
					author: dep.split('+')[0],
					name: dep.slice(dep.indexOf('+') + 1, dep.indexOf('@')),
					version: dep.split('@')[1],
				};

				if (!dependency.author)
					throw new Error("Dependency format incorrect: can't find author");
				if (!dependency.name)
					throw new Error("Dependency format incorrect: can't find name");
				if (!dependency.version)
					throw new Error("Dependency format incorrect: can't find version");

				if (
					fs.existsSync(
						path.join(process.cwd(), 'mods', dependency.name, 'mod.json'),
					)
				) {
					const dependencyJson: Mod = fs.readJsonSync(
						path.join(process.cwd(), 'mods', dependency.name, 'mod.json'),
					);

					if (dependencyJson.version !== dependency.version)
						throw new Error(
							`${modJson.name} requires version ${dependency.version} of ${dependency.name} but version ${dependencyJson.version} is installed`,
						);
					if (
						dependencyJson.author.toLowerCase() !==
						dependency.author.toLowerCase()
					)
						throw new Error(
							`${modJson.name} requires mod ${dependency.name} by ${dependency.author} but ${dependency.name} by ${dependencyJson.author} is installed`,
						);
				} else
					throw new Error(
						`Couldn't find dependency ${dependency.name} for ${modJson.author}+${modJson.name}@${modJson.version}`,
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

		if (modJson.main.endsWith('.ts')) {
			console.timeLog('Started', `Transpiling ${modJson.name}`);
			await build({
				entrypoints: [
					path.join(process.cwd(), 'mods', modJson.name, modJson.main),
				],
				target: 'browser',
				outdir:
					modJson.main.split('/').length === 1
						? path.join(process.cwd(), 'mods', modJson.name)
						: path.join(
								process.cwd(),
								'mods',
								modJson.name,
								modJson.main,
								'../',
						  ),
			});
			modJson.main = modJson.main.replace('.ts', '.js');
			fs.writeJson(
				path.join(process.cwd(), 'mods', modJson.name, 'mod.json'),
				modJson,
			);
		}

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
