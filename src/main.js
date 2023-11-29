const path = require('path');
const fs = require('fs');
const nodeNotifier = require('node-notifier');
const spawn = require('child_process').spawn;
const {console}= require('./assets/console.js');
const {packagenw} = require('./assets/packageHandler.js');
const htmlPatches = require('./patches/htmlPatches.js');
const { exec } = require('child_process');

console.log('Starting MIML');

(async () => {

const gamePath = process.cwd();

// #region Dev tools
const devTools = {
    regen: () => {
        console.log('regenerating from source');
        fs.cpSync(path.join(gamePath, '../Moonstone Island/'), path.join(gamePath, 'game/'), {recursive: true, force: true});
    }
}
const forDebug = {
    devTools
}
// #endregion

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
        <script>
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

exec(`"${executable}"`, {cwd: gamePath}, (err, stdout, stderr) => {
    console.log('Game started :3');
    if (err) {
        console.error(err);
        return;
    }
    console.log(stdout);
    console.error(stderr);
}).on('exit', (code) => {
    console.log(`Game exited with code ${code}`);
    process.exit(0);
});
})();