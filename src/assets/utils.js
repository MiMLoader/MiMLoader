const compressing = require('compressing');
const path = require('path');
const fs = require('fs');
const htmlPatches = require('../patches/htmlPatches.js');
const nodeNotifier = require('node-notifier');
const axios = require('axios');
const { modLoaderServer } = require('./modLoaderServer.js');
const { shell } = require('electron');
const express = require('express');


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
		fs.writeFileSync(path.join(gamePath, 'config.json'), JSON.stringify({}));
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
			if (auth.isAuth) {
				const headers = {
					Accept: 'application/json',
					'Content-Type': 'application/x-www-form-urlencoded',
					Authorization: `Bearer ${auth.token}`,
				};
				let response = await axios
					.get(
						`https://g-5846.modapi.io/v1/games/5846/mods?api_key=10d88d967c5d5f5f065dbc2388d7f738&name_id=${dependency}`,
						{ headers: headers }
					)
					.catch((err) => {
						console.error(err);
						nodeNotifier.notify({
							title: 'MIML',
							message: `Failed to find Dependency ${dependency}, Please install it manually. Err: ${err}`,
						});
						process.exit(0);
					});

				if (response.data.result_total === 0) {
					console.error('Failed to find Dependency');
					nodeNotifier.notify({
						title: 'MIML',
						message: `Failed to find Dependency ${dependency}, Please install it manually.`,
					});
					process.exit(0);
				}
				const downloadUrl =
					response.data.data[0].modfile.download.binary_url;
				console.log(`Downloading ${downloadUrl}`);
				await axios
					.get(downloadUrl, { responseType: 'stream' })
					.then(async (response) => {
						console.log('Downloaded dependency');
						await new Promise((resolve, reject) => {
							const writer = fs.createWriteStream(
								path.join(
									gamePath,
									'mods',
									dependency + '.zip'
								)
							);
							response.data.pipe(writer);
							let error = null;
							writer.on('error', (err) => {
								error = err;
								writer.close();
								reject(err);
							});
							writer.on('close', () => {
								if (!error) {
									resolve();
								}
							});
						});
					});
				console.log('Installing dependency');
				await loadMod(dependency + '.zip');
				console.log('Dependency installed');
			} else {
				nodeNotifier.notify({
					title: 'MIML',
					message: `Missing dependency ${dependency}, Please install it manually or relaunch with an Auth Key.`,
				});
				process.exit(0);
			}
		}
	}
	console.log('Dependencies Ok');
	miml.mods.push(mod);
	modLoaderServer.addImport(mod, gamePath);
};

const app = express();

app.get('/auth/discord/callback', async (req, res) => {
	const code = req.query.code;
	const access_token = req.query.access_token;
    if (code !== '200') {
		res.sendFile(__dirname + '/error.html');
		console.warn('Auth failed');
        return auth.resolve();
    }
	console.log('Auth success');
	res.sendFile(__dirname + '/callback.html');
	auth.token = access_token;
	auth.isAuth = true;
    return auth.resolve();
});

let server;
const auth = {
    resolve: null,
    isAuth: false,
	token: null,
	server: {
		start: () => {
			return new Promise((resolve) => {
				server = app.listen(5313, () => {
					resolve();
				});
			});
		},
		stop: () => {
			server.close();
		},
	},
	start: async () => {
		await auth.server.start();
        shell.openExternal('https://mimloader.com/auth/login');
        await auth.complete;
        auth.server.stop();
	},
};
auth.complete = new Promise((resolve) => {
    auth.resolve = resolve;
}),

module.exports = {
	firstTimeSetup,
	packagenw,
	loadMod,
	auth,
};