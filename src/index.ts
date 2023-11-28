import console from "./assets/console";
import path from "path";
import fs from "fs";
import nodeNotifier from "node-notifier";
import * as packagenw from "./assets/packageHandler";
import * as htmlPatches from "./patches/htmlPatches";
import { spawn } from "child_process";

console.log('Starting MIML');

const gamePath = process.cwd();

// #region Dev tools
const devTools = {
    regen: () => {
        console.log('regenerating from source');
        fs.cpSync(path.join(gamePath, '../Moonstone Island/'), gamePath, {recursive: true, force: true});
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

const firstTimeSetup = async () => {
    console.log('Performing first time setup');
    // copy game files
    try {
    fs.cpSync(path.join(gamePath, '../Moonstone Island/'), gamePath, {recursive: true});
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
        let chromiumArgs: string[] = json['chromium-args'].split(' ');
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
    fs.rmSync(path.join(gamePath, 'package.nw'), {force: true});
    
    await packagenw.compress();
    fs.rmdirSync(path.join(gamePath, 'tmp-package'), {recursive: true});
    // #endregion
}

// First time setup
if (fs.readdirSync(gamePath).length <=1) {
    firstTimeSetup().then(() => {
        console.log('First time setup complete');
    });
} else {
    console.log('Skipping first time setup (game files already exist)');
}

console.log('Starting game');
spawn(path.join(gamePath, 'Moonstone Island'), [], {});
console.log('Game started :3');