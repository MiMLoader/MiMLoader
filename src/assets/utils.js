const compressing = require('compressing');
const path = require('path');
const fs = require('fs');
const htmlPatches = require('../patches/htmlPatches.js');
const { modLoaderServer } = require('./modLoaderServer.js');
const { BrowserWindow, app } = require('electron');

const gamePath = process.cwd();
const preloadMods = [];

const firstTimeSetup = async () =>
{
	console.log('Performing first time setup');

	// Detect if game files exist
	if (!fs.existsSync(path.join(gamePath, '../Moonstone Island'))) {
		await displayError('Original game files not found. Check out the installation guide.');
	}

	// create mods folder
	try {
		fs.mkdirSync(path.join(gamePath, 'mods'));
	} catch (err) {
		if (err.code === 'EEXIST') {
			console.log('Mods folder already exists');
		} else {
			await displayError(`Failed to create mods folder, ${err}`);
		}
	}

	// create config.json file
	try {
		fs.writeFileSync(
			path.join(gamePath, 'config.json'),
			JSON.stringify({})
		);
	} catch (err) {
		await displayError(`Failed to create config.json file, ${err}`);
	}

	// clear old game files
	if (fs.existsSync(path.join(gamePath, 'game'))) {
		console.log('Clearing old game files');
		try {
			fs.rmSync(path.join(gamePath, 'game'), { recursive: true });
		} catch (err) {
			await displayError(`Failed to clear old game files, ${err}`);
		}
	}

	// copy game files
	try {
		fs.cpSync(
			path.join(gamePath, '../Moonstone Island/'),
			path.join(gamePath, 'game/'),
			{ recursive: true }
		);
	} catch (err) {
		await displayError(`Failed to copy game files, ${err}`);
	}

	await packagenw.decompress();

	// enable chrome devtools
	console.log('Enabling chrome devtools');
	fs.readFile(
		path.join(gamePath, 'tmp-package', 'package.json'),
		(err, data) =>
		{
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
				(err) =>
				{
					if (err) throw err;
				}
			);
		}
	);

	// patch in runtime interface
	console.log('Patching in runtime interface');
	fs.readFile(
		path.join(gamePath, 'tmp-package', 'scripts', 'main.js'),
		(err, data) =>
		{
			if (err) throw err;
			let js = data.toString();
			js = js.replace(/iRuntime=a;/, 'iRuntime=a;window.mimlRuntimeInterface=a;');

			fs.writeFile(
				path.join(gamePath, 'tmp-package', 'scripts', 'main.js'),
				js,
				(err) =>
				{
					if (err) throw err;
				}
			);
		}
	);

	// html patches
	console.log('Applying html patches');
	fs.readFile(
		path.join(gamePath, 'tmp-package', 'index.html'),
		(err, data) =>
		{
			if (err) throw err;

			let html = data.toString();
			html = html.replace(
				'<title>Moonstone Island</title>',
				'<title>Moonstone Island Mod Loader</title>'
			);
			html = html.replace(
				'</body>',
				`
    <script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>
    <script>
    let mimlAPIGlobal={};
    ${htmlPatches.modLoaderClient}
    </script>
    </body>`
			);
			fs.writeFile(
				path.join(gamePath, 'tmp-package', 'index.html'),
				html,
				async (err) =>
				{
					if (err) {
						await displayError(`Failed to patch game, ${err}`);
					}
				}
			);
		}
	);

	// change intro screen
	console.log('Changing intro screen');

	const mediaPath = fs.readdirSync(path.join(gamePath, 'tmp-package/media'));

	const intro = mediaPath.find((file) => file.includes('Intro') && !file.includes('Music'));

	if (intro) {
		fs.rmSync(path.join(gamePath, 'tmp-package', 'media', intro), { force: true });
		fs.copyFileSync
			(
				path.join(__dirname, 'intro.webm'),
				path.join(gamePath, 'tmp-package', 'media', intro)
			);
	}

	fs.rmSync(path.join(gamePath, 'game/package.nw'), { force: true });
	await packagenw.compress();

	fs.rmSync(path.join(gamePath, 'tmp-package'), { recursive: true });
	console.log('First time setup complete');
};

const packagenw = {
	decompress: async () =>
	{
		await compressing.zip
			.uncompress(
				path.join(gamePath, 'game/package.nw'),
				path.join(gamePath, 'tmp-package')
			)
			.catch(async (err) =>
			{
				await displayError(`Failed to decompress package, ${err}`);
			});
	},
	compress: async () =>
	{
		await compressing.zip
			.compressDir(
				path.join(gamePath, 'tmp-package'),
				path.join(gamePath, 'game/package.nw'),
				{ ignoreBase: true }
			)
			.catch(async (err) =>
			{
				await displayError(`Failed to compress package, ${err}`);
			});
	},
};

const loadMod = async (file, miml) =>
{
	if (file.endsWith('.zip')) {
		console.log(`Installing ${file}`);
		// extract mod
		await compressing.zip
			.uncompress(
				path.join(gamePath, 'mods', file),
				path.join(gamePath, 'mods', file.replace('.zip', ''))
			)
			.then(() =>
			{
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
		await displayError(`Failed to load mod ${file}, ${err}`);
	}

	// rename zip with mod name from mod.json
	if (file.endsWith('.zip')) {
		fs.renameSync(
			path.join(gamePath, 'mods', file.replace('.zip', '')),
			path.join(gamePath, 'mods', mod.name)
		);
	}

	console.log(`Loading ${mod.name} (${mod.version})`);
	console.log('Checking dependencies');
	const mods = fs.readdirSync(path.join(gamePath, 'mods'));

	for (let i = 0; i < mod.dependencies.length; i++) {
		const dependency = mod.dependencies[i];
		if (!mods.includes(dependency)) {
			await displayError(
				`Missing dependency ${dependency} for mod ${mod.name}`
			);
		}
	}
	console.log('Dependencies Ok');

	if (!mod.preload) {
		miml.mods.push(mod);
		modLoaderServer.addImport(mod, gamePath);
	} else {
		console.log(`Preloading ${mod.preload} for ${mod.name}`);
		preloadMods.push(mod);
	}
};

const displayError = async (err) =>
{
	console.error(err);
	const loadWindow = () =>
	{
		const errorWindow = new BrowserWindow({
			width: 1114,
			height: 358,
			frame: false,
			transparent: true,
			center: true,
			alwaysOnTop: true,
			resizable: false,
		});
		errorWindow.loadFile(path.join(__dirname, './error.html'));
		errorWindow.webContents.on('did-finish-load', () =>
		{
			errorWindow.webContents.executeJavaScript(
				`document.getElementById('error').innerHTML = '${err}'`
			);
		});
		errorWindow.on('closed', () =>
		{
			errorWindow.destroy();
			process.exit(0);
		});
	};
	app.whenReady().then(loadWindow);
	await new Promise(() => { });
};

module.exports = {
	firstTimeSetup,
	packagenw,
	loadMod,
	displayError,
	preloadMods,
};