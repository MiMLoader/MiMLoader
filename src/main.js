const path = require('path');
const fs = require('fs');
const nodeNotifier = require('node-notifier');
const { modLoaderServer } = require('./assets/modLoaderServer.js');
const { firstTimeSetup, loadMod } = require('./assets/utils.js');
const { exec } = require('child_process');
console.clear();

console.log('Starting MIML');

(async () => {
	const gamePath = process.cwd();
	const miml = {
		mods: [],
	};

	// Detect if game files exist
	if (!fs.existsSync(path.join(gamePath, '../Moonstone Island'))) {
		nodeNotifier.notify({
			title: 'MIML',
			message:
				'Original game files not found. Check out the installation guide.',
		});
		process.exit(0);
	}

	// Startup cleanup
	if (fs.existsSync(path.join(gamePath, 'tmp-package'))) {
		fs.rmSync(path.join(gamePath, 'tmp-package'), {
			recursive: true,
			force: true,
		});
	}

	// First time setup
	if (!fs.existsSync(path.join(gamePath, 'game/'))) {
		await firstTimeSetup();
	} else {
		console.log('Skipping first time setup (game files already exist)');
	}

	console.log('Loading mods');
	await new Promise((resolve) => {
		if (fs.readdirSync(path.join(gamePath, 'mods')).length === 0) {
			console.log('No mods found');
			resolve();
		} else {
			fs.readdirSync(path.join(gamePath, 'mods')).forEach(
				async (file, index, array) => {
					await loadMod(file, miml);
					if (index === array.length - 1) resolve();
				}
			);
		}
	}).catch((err) => {
		console.error(err);
		nodeNotifier.notify({
			title: 'MIML',
			message: `Failed to load mods. Err: ${err}`,
		});
		process.exit(0);
	});

	console.log('Starting game');

	let executable;
	switch (process.platform) {
		case 'win32':
			console.log('Running on Windows');
			executable = path.join(gamePath, 'game', 'Moonstone Island.exe');
			break;
		case 'linux':
			console.log('Running on Linux');
			executable = path.join(gamePath, 'game', 'Moonstone Island');
			break;
		case 'darwin':
			console.log('MacOS');
			break;
		default:
			console.log('OS not supported');
			process.exit(0);
	}

	modLoaderServer.start();
	exec(`"${executable}"`, { cwd: gamePath }, (err, stdout, stderr) => {
		if (err) {
			console.error(err);
			return;
		}
		console.log(stdout);
		console.error(stderr);
	})
		.on('exit', (code) => {
			console.log(`Game exited with code ${code}`);
			modLoaderServer.stop();
			process.exit(0);
		})
		.on('spawn', () => {
			console.log('Game started :3');
			modLoaderServer.io.on('connection', () => {
				modLoaderServer.import();
				modLoaderServer.io.emit('global', miml);
			});
		});
})();
