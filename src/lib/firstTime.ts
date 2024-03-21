import path from 'node:path';
import { zip } from 'compressing';
import * as fs from 'fs-extra';

export const firstTime = async () => {
	// Do original game files exist?
	if (!fs.existsSync(path.join(process.cwd(), '../Moonstone Island')))
		throw new Error('Original game files not found');

	// Clear old game files
	if (fs.existsSync(path.join(process.cwd(), 'game')))
		fs.removeSync(path.join(process.cwd(), 'game'));

	// Copy original game files
	console.timeLog('Started', 'Copying original game files');
	await fs.copy(
		path.join(process.cwd(), '../Moonstone Island'),
		path.join(process.cwd(), 'game'),
	);

	// Unpack game files
	console.timeLog('Started', 'Unpacking game files');
	await fs
		.rename(
			path.join(process.cwd(), 'game/package.nw'),
			path.join(process.cwd(), 'game/package.clean.nw'),
		)
		.catch((err) => {
			throw new Error(err);
		});
	await zip
		.uncompress(
			path.join(process.cwd(), 'game/package.clean.nw'),
			path.join(process.cwd(), 'game/package.nw'),
		)
		.catch((err) => {
			throw new Error(err);
		});

	// Enable devtools (delete --disable-devtools from package.json)
	console.timeLog('Started', 'Enabling devtools');
	await fs
		.readJSON(path.join(process.cwd(), 'game/package.nw/package.json'))
		.then(async (data) => {
			data['chromium-args'] = data['chromium-args'].replace(
				'--disable-devtools',
				'',
			);
			await fs.writeJSON(
				path.join(process.cwd(), 'game/package.nw/package.json'),
				data,
			);
		});

	// Patch game engine
	console.timeLog('Started', 'Patching game engine');
	await fs
		.readFile(
			path.join(process.cwd(), 'game', 'package.nw', 'scripts', 'main.js'),
		)
		.then(async (data) => {
			await fs.writeFile(
				path.join(process.cwd(), 'game', 'package.nw', 'scripts', 'main.js'),
				data
					.toString()
					// MIGHT NOT WORK PLS CHECK
					.replace(/iRuntime=a;/, 'iRuntime=a;window.miml={runtime: a};'),
			);
		});

	// Inject mod scripts
	console.timeLog('Started', 'Injecting mod script');
	await fs
		.readFile(path.join(process.cwd(), 'game', 'package.nw', 'index.html'))
		.then(async (data) => {
			await fs.writeFile(
				path.join(process.cwd(), 'game', 'package.nw', 'index.html'),
				data
					.toString()
					.replace(
						'</body>',
						'<script src="http://localhost:5131/compiledmods" type="module" defer></script></body>',
					),
			);
		});
};
