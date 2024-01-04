const compressing = require('compressing');
const path = require('path');
const fs = require('fs');
const htmlPatches = require('../patches/htmlPatches.js');
const nodeNotifier = require('node-notifier');
const { modLoaderServer } = require('./modLoaderServer.js');

const gamePath = process.cwd();

const firstTimeSetup = async () => {
	console.log('Performing first time setup');

	// create mods folder
	try {
		fs.mkdirSync(path.join(gamePath, 'mods'));
	} catch (err) {
		if (err.code === 'EEXIST') {
			console.log('Mods folder already exists');
		} else {
			console.error(err);
			nodeNotifier.notify({
				title: 'MIML',
				message: `Failed to create mods folder. Err: ${err}`,
			});
			process.exit(0);
		}
	}

	// create config.json file
	try {
		fs.writeFileSync(
			path.join(gamePath, 'config.json'),
			JSON.stringify({})
		);
	} catch (err) {
		console.error(err);
		nodeNotifier.notify({
			title: 'MIML',
			message: `Failed to create config.json. Err: ${err}`,
		});
		process.exit(0);
	}

	// copy game files
	try {
		fs.cpSync(
			path.join(gamePath, '../Moonstone Island/'),
			path.join(gamePath, 'game/'),
			{ recursive: true }
		);
	} catch (err) {
		console.error(err);
		nodeNotifier.notify({
			title: 'MIML',
			message: `Failed to copy over game files. Err: ${err}`,
		});
		process.exit(0);
	}

	await packagenw.decompress();

	// enable chrome devtools
	fs.readFile(
		path.join(gamePath, 'tmp-package', 'package.json'),
		(err, data) => {
			if (err) throw err;
			const json = JSON.parse(data.toString());
			let chromiumArgs = json['chromium-args'].split(' ');
			for (let i = 0; i < chromiumArgs.length; i++) {
				if (chromiumArgs[i].includes('--disable-devtools')) {
					chromiumArgs.splice(i, 1);
					break;
				}
			}
			json['chromium-args'] = chromiumArgs.join(' ');
			fs.writeFile(
				path.join(gamePath, 'tmp-package', 'package.json'),
				JSON.stringify(json, null, 4),
				(err) => {
					if (err) throw err;
				}
			);
		}
	);

	// html patches
	fs.readFile(
		path.join(gamePath, 'tmp-package', 'index.html'),
		(err, data) => {
			if (err) throw err;

			let html = data.toString();
			html = html.replace(
				'<title>Moonstone Island</title>',
				'<title>Moonstone Island | Modded Alpha</title>'
			);
			html = html.replace(
				'</body>',
				`
    <script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>
    <script>
    let mimlAPIGlobal={};
    ${htmlPatches.modLoaderClient}
    ${htmlPatches.hiddenMenu}
    </script>
    </body>`
			);
			fs.writeFile(
				path.join(gamePath, 'tmp-package', 'index.html'),
				html,
				(err) => {
					if (err) {
						console.error(err);
						nodeNotifier.notify({
							title: 'MIML',
							message: `Failed to patch index.html. Err: ${err}`,
						});
						process.exit(0);
					}
				}
			);
		}
	);
	fs.rmSync(path.join(gamePath, 'game/package.nw'), { force: true });

	await packagenw.compress();

	fs.rmSync(path.join(gamePath, 'tmp-package'), { recursive: true });
	console.log('First time setup complete');
};

const packagenw = {
	decompress: async () => {
		await compressing.zip
			.uncompress(
				path.join(gamePath, 'game/package.nw'),
				path.join(gamePath, 'tmp-package')
			)
			.catch((err) => {
				console.error(err);
				nodeNotifier.notify({
					title: 'MIML',
					message: `Failed to decompress package.nw. Err: ${err}`,
				});
				process.exit(0);
			});
	},
	compress: async () => {
		await compressing.zip
			.compressDir(
				path.join(gamePath, 'tmp-package'),
				path.join(gamePath, 'game/package.nw'),
				{ ignoreBase: true }
			)
			.catch((err) => {
				console.error(err);
				nodeNotifier.notify({
					title: 'MIML',
					message: `Failed to compress package.nw. Err: ${err}`,
				});
				process.exit(0);
			});
	},
};

const loadMod = async (file, miml) => {
	if (file.endsWith('.zip')) {
		console.log(`Installing ${file}`);
		// extract mod
		await compressing.zip
			.uncompress(
				path.join(gamePath, 'mods', file),
				path.join(gamePath, 'mods', file.replace('.zip', ''))
			)
			.then(() => {
				console.log('Mod extracted');
				fs.rmSync(path.join(gamePath, 'mods', file), {
					force: true,
				});
			});
	}
	let mod;
	try {
		mod = JSON.parse(
			fs
				.readFileSync(
					path.join(
						gamePath,
						'mods',
						file.replace('.zip', ''),
						'mod.json'
					)
				)
				.toString()
		);
	} catch (err) {
		console.error(`Failed to load mod ${file}. Err: ${err}`);
		nodeNotifier.notify({
			title: 'MIML',
			message: `Failed to load mod ${file}. Err: ${err}`,
		});
		process.exit(0);
	}

	console.log(`Loading ${mod.name} (${mod.version})`);
	console.log('Checking dependencies');
	const mods = fs.readdirSync(path.join(gamePath, 'mods'));

	for (let i = 0; i < mod.dependencies.length; i++) {
		const dependency = mod.dependencies[i];
		if (!mods.includes(dependency)) {
			console.error(`Missing dependency ${dependency}`);
			nodeNotifier.notify({
				title: 'MIML',
				message: `Missing dependency ${dependency}, Please install it manually.`,
			});
			process.exit(0);
		}
	}
	console.log('Dependencies Ok');
	miml.mods.push(mod);
	modLoaderServer.addImport(mod, gamePath);
};

module.exports = {
	firstTimeSetup,
	packagenw,
	loadMod,
	auth,
};