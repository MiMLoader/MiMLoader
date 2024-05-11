console.clear();
import { exec } from 'node:child_process';
import path from 'node:path';
import { existsSync } from 'fs-extra';
import { ipc, preloadModsList, startUp } from './lib';

(async () => {
	console.log('Starting MiMLoader');
	console.time('Started');

	await startUp();
	ipc.start();

	let executable: string | undefined;
	if (existsSync(path.join(process.cwd(), 'game', 'Moonstone Island.exe'))) {
		executable = path.join(process.cwd(), 'game', 'Moonstone Island.exe');
	} else if (existsSync(path.join(process.cwd(), 'game', 'Moonstone Island'))) {
		executable = path.join(process.cwd(), 'game', 'Moonstone Island');
	} else if (
		existsSync(path.join(process.cwd(), 'game', 'Moonstone Island.app'))
	) {
		executable = path.join(
			process.cwd(),
			'game',
			'Moonstone Island.app',
			'Contents',
			'MacOS',
			'nwjs',
		);
	}

	if (executable) {
		exec(`"${executable}"`, async (error, stdout, stderr) => {
			if (error) throw error;
			console.log(stdout);
			console.error(stderr);
		})
			.on('exit', (code: number) => {
				console.log(`Moonstone Island exited with code ${code}`);
				process.exit(0);
			})
			.on('spawn', () => {
				console.timeLog('Started', 'Moonstone Island');

				for (const mod of preloadModsList) {
					console.timeLog('Started', `Preloading mod: ${mod.name}`);
					require(`${mod.path}`);
				}

				console.timeEnd('Started');
			});
	} else {
		throw new Error('Could not find Moonstone Island executable');
	}
})();
