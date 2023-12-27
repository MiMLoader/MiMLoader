const path = require('path');
const fs = require('fs');
const express = require('express');
const nodeNotifier = require('node-notifier');
const { console } = require('./assets/console.js');
const { packagenw } = require('./assets/packageHandler.js');
const { modLoaderServer } = require('./assets/modLoaderServer.js');
const htmlPatches = require('./patches/htmlPatches.js');
const compressing = require('compressing');
const { exec } = require('child_process');
const axios = require('axios');
console.clear();

console.log('Starting MIML');

(async () => {
const gamePath = process.cwd();
const miml = {
    mods: [],
};

if (!fs.existsSync(path.join(gamePath, '../Moonstone Island'))) {
    nodeNotifier.notify({
        title: 'MIML',
        message:
            'Original game files not found. Check out the installation guide.',
    });
    process.exit(0);
}

// startup cleanup
if (fs.existsSync(path.join(gamePath, 'tmp-package'))) {
    fs.rmSync(path.join(gamePath, 'tmp-package'), {
        recursive: true,
        force: true,
    });
}

// First time setup
if (!fs.existsSync(path.join(gamePath, 'game/'))) {
    console.log('Performing first time setup');

    // create mods folder
    try {
        fs.mkdirSync(path.join(gamePath, 'mods'));
    } catch (err) {}

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
            message: `Failed to copy over game files (report it on discord :D). Err: ${err}`,
        });
        process.exit(0);
    }

    // #region patch package.nw
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
                    if (err) throw err;
                }
            );
        }
    );
    fs.rmSync(path.join(gamePath, 'game/package.nw'), { force: true });

    await packagenw.compress();
    fs.rmSync(path.join(gamePath, 'tmp-package'), { recursive: true });
    console.log('First time setup complete');
    // #endregion
} else {
    console.log('Skipping first time setup (game files already exist)');
}

console.log('Loading mods');
const loadMod = async (file) => {
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
                    ).toString()
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
            if (key) {
                const headers = {
                    Accept: 'application/json',
                    'User-Agent': 'miml',
                };
                let response;
                try {
                    response = await axios.get(
                        `https://g-5846.modapi.io/v1/games/5846/mods?api_key=${key}&name=${dependency}`,
                        { headers: headers }
                    );
                } catch (err) {
                    console.error(err);
                    nodeNotifier.notify({
                        title: 'MIML',
                        message: `Failed to find Dependency ${dependency} (${err}), Please install it manually.`,
                    });
                }
                console.log(response)
                if (response.data.result_total === 0) {
                    console.error('Failed to find Dependency');
                    nodeNotifier.notify({
                        title: 'MIML',
                        message: `Failed to find Dependency ${dependency}, Please install it manually.`,
                    });
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
                                path.join(gamePath, 'mods', dependency + '.zip')
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
            }
        }
    }
    console.log('Dependencies Ok');
    miml.mods.push(mod);
    modLoaderServer.addImport(mod, gamePath);
};
await new Promise((resolve, reject) => {
    fs.readdirSync(path.join(gamePath, 'mods')).forEach(
        async (file, index, array) => {
            loadMod(file);
            if (index === array.length - 1) resolve();
        }
    );
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
