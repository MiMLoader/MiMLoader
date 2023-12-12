const path = require('path');
const fs = require('fs');
const express = require('express');
const nodeNotifier = require('node-notifier');
const {console}= require('./assets/console.js');
const {packagenw} = require('./assets/packageHandler.js');
const {modLoaderServer} = require('./assets/modLoaderServer.js');
const htmlPatches = require('./patches/htmlPatches.js');
const compressing = require('compressing');
const { exec } = require('child_process');
const axios = require('axios');
console.clear();

console.log('Starting MIML');
let fatalError = false;

(async () => {
const gamePath = process.cwd();
const miml = {
    mods: []
};

if (!fs.existsSync(path.join(gamePath, '../Moonstone Island'))) {
    nodeNotifier.notify({
        title: 'MIML',
        message: 'Original game files not found. Check out the installation guide.'
    });
    process.exit(0);
}

// startup cleanup
if(fs.existsSync(path.join(gamePath, 'tmp-package'))) { fs.rmSync(path.join(gamePath, 'tmp-package'), {recursive: true, force: true})};

// First time setup
if(!fs.existsSync(path.join(gamePath, 'game/'))) {
    console.log('Performing first time setup');

    // create mods folder
    try {
        fs.mkdirSync(path.join(gamePath, 'mods'));
    } catch (err) {}

    // copy game files
    try {
        fs.cpSync(path.join(gamePath, '../Moonstone Island/'), path.join(gamePath, 'game/'), {recursive: true});
    } catch (err) {
        console.error(err);
        nodeNotifier.notify({
            title: 'MIML',
            message: `Failed to copy over game files (report it on discord :D). Err: ${err}`
        });
        process.exit(0);
    }

    // #region patch package.nw
    await packagenw.decompress();
    
    // enable chrome devtools
    fs.readFile(path.join(gamePath, 'tmp-package', 'package.json'), (err, data) => {
        if (err) throw err;
        const json = JSON.parse(data.toString());
        let chromiumArgs = json['chromium-args'].split(' ');
        for (let i = 0; i < chromiumArgs.length; i++) {
            if(chromiumArgs[i].includes('--disable-devtools')) {
                chromiumArgs.splice(i, 1);
                break;
            }
        }
        json['chromium-args'] = chromiumArgs.join(' ');
        fs.writeFile(path.join(gamePath, 'tmp-package', 'package.json'), JSON.stringify(json, null, 4), (err) => {
            if (err) throw err;
        });
    });

    // html patches
    fs.readFile(path.join(gamePath, 'tmp-package', 'index.html'), (err, data) => {
        if (err) throw err;
        let html = data.toString();
        html = html.replace('<title>Moonstone Island</title>', '<title>Moonstone Island | Modded Alpha</title>');
        html = html.replace('</body>', `
        <script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>
        <script>
            let mimlAPIGlobal={};
            ${htmlPatches.modLoaderClient}
            ${htmlPatches.hiddenMenu}
        </script>
        </body>`);
        fs.writeFile(path.join(gamePath, 'tmp-package', 'index.html'), html, (err) => {
            if (err) throw err;
        });
    });
    fs.rmSync(path.join(gamePath, 'game/package.nw'), {force: true});
    
    await packagenw.compress();
    fs.rmSync(path.join(gamePath, 'tmp-package'), {recursive: true});
    console.log('First time setup complete');
    // #endregion
} else {
    console.log('Skipping first time setup (game files already exist)');
}

console.log('Loading mods');
fs.readdirSync(path.join(gamePath, 'mods')).forEach(async file => {
    if (file.endsWith('.zip')) {
        console.log(`Installing ${file}`);
        // extract mod
        await compressing.zip.uncompress(path.join(gamePath, 'mods', file), path.join(gamePath, 'mods', file.replace('.zip', ''))).then(() => {
            console.log('Mod extracted');
            fs.rmSync(path.join(gamePath, 'mods', file), {force: true});
        });
    }
    const mod = JSON.parse(fs.readFileSync(path.join(gamePath, 'mods', file.replace('.zip', ''), 'mod.json')).toString());
    console.log(`Loading ${mod.name} (${mod.version})`);
    console.log('Checking dependencies');
    const mods = fs.readdirSync(path.join(gamePath, 'mods'));
    for (let i = 0; i < mod.dependencies.length; i++) {
        const dependency = mod.dependencies[i];
        if (!mods.includes(dependency)) {
            console.error(`Missing dependency ${dependency}`);
            nodeNotifier.notify({
                title: 'MIML',
                message: `Missing dependency ${dependency}, Installing...`
            });
            const headers = {
                'Accept': 'application/json'
            };

            let response = await axios.get(`https://g-5846.modapi.io/v1/games/5846/mods?api_key=10d88d967c5d5f5f065dbc2388d7f738&name=${dependency}`, {headers: headers});
            if (response.data.data.length == 0) {
                console.error('Failed to find Dependency');
                nodeNotifier.notify({
                    title: 'MIML',
                    message: `Failed to find Dependency ${dependency}, Please install it manually.`
                });
                process.kill(process.pid);

            }
            const downloadUrl = response.data.data[0].modfile.download.binary_url;
            console.log(`Downloading ${downloadUrl}`);
        }
    }
    console.log('Dependencies OK');    
    miml.mods.push(mod);
    modLoaderServer.addImport(mod, gamePath);
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
let msi = exec(`"${executable}"`, {cwd: gamePath}, (err, stdout, stderr) => {
    if (err) {
        console.error(err);
        return;
    }
    console.log(stdout);
    console.error(stderr);
}).on('exit', (code) => {
    console.log(`Game exited with code ${code}`);
    modLoaderServer.stop();
    process.exit(0);
}).on('spawn', () => {
    if (fatalError){msi.kill(); process.kill(process.pid); return;}
    console.log('Game started :3');
    modLoaderServer.io.on('connection', () => {
        modLoaderServer.import();
        modLoaderServer.io.emit('global', miml);
    });
});
})();