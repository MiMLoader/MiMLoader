import extract from "extract-zip";
const archiver = require('archiver');
import { merge } from 'merge-anything';
import { existsSync, mkdirSync, readdirSync, rmdirSync, cpSync, createWriteStream, rmSync } from "fs";
import nodeNotifier from "node-notifier";
import path from "path";

// does executable exist?
if (!existsSync('Moonstone Island/Moonstone Island')) {
    nodeNotifier.notify({
        title: 'MIML',
        message: 'Your Moonstone Island steam folder/executable couldn\'t be found. Pop a message in the discord and we\'ll help you out.'
    });
    process.exit(0);
}

let fullPath = path.resolve('Moonstone Island/');

// does mods folder exist?
!existsSync(`${fullPath}/mods/`).valueOf() ? mkdirSync(`${fullPath}/mods/`) : null

// are there any mods?
const mods = readdirSync(`${fullPath}/mods/`)
if (mods.length !== 0) {
    console.log('[MIML]', 'Mods found:', mods);
    if (mods.length > 1) {
        console.log('[MIML]', 'Multiple mods found, bundling into one package.');
        // bundle mods into one package
        if (existsSync(`${fullPath}/bundle/`)) {rmdirSync(`${fullPath}/bundle/`, { recursive: true });}
        if (existsSync(`${fullPath}/package/`)) {rmdirSync(`${fullPath}/package/`, { recursive: true });}
        mkdirSync(`${fullPath}/bundle`);
        mods.forEach(mod => {
            extract(`${fullPath}/mods/${mod}`, { dir: `${fullPath}/bundle/`, });
            
            console.log('[MIML]', 'Extracted:', mod);
        })
        console.log('[MIML]', 'Bundled.');

        console.log('[MIML]', 'Extracting package.nw');
        await extract(`${fullPath}/package.nw`, { dir: `${fullPath}/package-tmp/`});
        console.log('[MIML]', 'Extracted.');

        // console.log('[MIML]', 'Patching with mods.');
        // cpSync(`${fullPath}/bundle`, `${fullPath}/package-tmp/`, {recursive: true});
        // console.log('[MIML]', 'Patched.');

        console.log('[MIML]', 'Deleting bundle and old package.');
        rmdirSync(`${fullPath}/bundle/`, { recursive: true });
        rmSync(`${fullPath}/package.nw`);
        console.log('[MIML]', 'Deleted.');

        console.log('[MIML]', 'Repackaging.');


        console.log('[MIML]', 'Repackaged.');

        console.log('[MIML]', 'Deleting tmp package.');
        rmdirSync(`${fullPath}/package-tmp/`, { recursive: true });
        console.log('[MIML]', 'Deleted.');

        console.log('[MIML]', 'Starting game.');
    }
    
} else {
    console.log('[MIML]', 'No mods found');
}

const app = Bun.spawn({
    cmd: [`${fullPath}/Moonstone\ Island`],
    stdout: "pipe",
    stderr: "pipe",
})

app.stdout.pipeTo(new WritableStream({
    write(chunk) {
        console.log(Buffer.from(chunk).toString())
    }
}))
app.stderr.pipeTo(new WritableStream({
    write(chunk) {
        console.log(Buffer.from(chunk).toString())
    }
}));

process.on('SIGINT', () => {
    console.log('[MIML] Killing main process');
    rmdirSync(`${fullPath}/bundle/`, { recursive: true });
    rmdirSync(`${fullPath}/package-tmp/`, { recursive: true });
    app.kill();
    process.exit(0);
});