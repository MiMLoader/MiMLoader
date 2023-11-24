console.log(`Runtime startup ${Bun.nanoseconds()/1000000}ms`);

import console from "./assets/console";
import path from "path";
import fs from "fs";
import nodeNotifier from "node-notifier";
import * as packagenw from "./assets/packageHandler";
import * as htmlPatches from "./patches/htmlPatches";

console.log(`Module import ${Bun.nanoseconds()/1000000}ms`);
const gamePath = process.cwd();

// #region Dev tools
// const devTools = {
//     regen: () => {
//         console.log('regenerating from source');
//         fs.cpSync(path.join(gamePath, '../Moonstone Island/'), gamePath, {recursive: true, force: true});
//     }
// }
// const forDebug = {
//     devTools
// }
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
if (fs.readdirSync(gamePath).length <=1) {
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
    Bun.file(path.join(gamePath, 'tmp-package', 'package.json')).json().then((json) => {
        let chromiumArgs: string[] = json['chromium-args'].split(' ');
        for (let i = 0; i < chromiumArgs.length; i++) {
            if(chromiumArgs[i].includes('--disable-devtools')) {
                chromiumArgs.splice(i, 1);
                break;
            }
        }
        json['chromium-args'] = chromiumArgs.join(' ');
        Bun.write(path.join(gamePath, 'tmp-package', 'package.json'), JSON.stringify(json, null, 4));
    });

    // html patches
    Bun.file(path.join(gamePath, 'tmp-package', 'index.html')).text().then((html) => {
        html = html.replace('<title>Moonstone Island</title>', '<title>Moonstone Island | Modded Alpha</title>');
        html = html.replace('</body>', `
        <script>
            ${htmlPatches.hiddenMenu}
        </script>
        </body>`);
        Bun.write(path.join(gamePath, 'tmp-package', 'index.html'), html);
    });
    
    fs.rmSync(path.join(gamePath, 'package.nw'), {force: true});
    
    await packagenw.compress();
    fs.rmdirSync(path.join(gamePath, 'tmp-package'), {recursive: true});
    // #endregion
}

console.log(`Launch ${Bun.nanoseconds()/1000000}ms`);

Bun.spawn({
    cmd: [path.join(gamePath, 'Moonstone Island')],
    cwd: gamePath,
    stdout: 'pipe',
    stderr: 'pipe',
});