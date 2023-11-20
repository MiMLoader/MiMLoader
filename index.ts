import extract from "extract-zip";
import archiver from "archiver";
import { merge } from 'merge-anything';
import { existsSync, mkdirSync, readdirSync, rmdirSync, cpSync, createWriteStream, rmSync } from "fs";

// does mods folder exist?
!existsSync(`${Bun.env.MIFOLDER}/mods/`).valueOf() ? mkdirSync(`${Bun.env.MIFOLDER}/mods/`) : null

// are there any mods?
const mods = readdirSync(`${Bun.env.MIFOLDER}/mods/`)
if (mods.length !== 0) {
    console.log('[MIML]', 'Mods found:', mods);
    if (mods.length > 1) {
        console.log('[MIML]', 'Multiple mods found, bundling into one package.');
        // bundle mods into one package
        if (existsSync(`${Bun.env.MIFOLDER}/bundle/`)) {rmdirSync(`${Bun.env.MIFOLDER}/bundle/`, { recursive: true });}
        if (existsSync(`${Bun.env.MIFOLDER}/package/`)) {rmdirSync(`${Bun.env.MIFOLDER}/package/`, { recursive: true });}
        mkdirSync(`${Bun.env.MIFOLDER}/bundle`);
        mods.forEach(mod => {
            extract(`${Bun.env.MIFOLDER}/mods/${mod}`, { dir: `${Bun.env.MIFOLDER}/bundle/`, });
            console.log('[MIML]', 'Extracted:', mod);
        })
        console.log('[MIML]', 'Bundled.');

        console.log('[MIML]', 'Extracting package.nw');
        await extract(`${Bun.env.MIFOLDER}/package.nw`, { dir: `${Bun.env.MIFOLDER}/package-tmp/`});
        console.log('[MIML]', 'Extracted.');

        console.log('[MIML]', 'Patching with mods.');
        cpSync(`${Bun.env.MIFOLDER}/bundle`, `${Bun.env.MIFOLDER}/package-tmp/`, {recursive: true});
        console.log('[MIML]', 'Patched.');

        console.log('[MIML]', 'Deleting bundle and old package.');
        rmdirSync(`${Bun.env.MIFOLDER}/bundle/`, { recursive: true });
        rmSync(`${Bun.env.MIFOLDER}/package.nw`);
        console.log('[MIML]', 'Deleted.');

        console.log('[MIML]', 'Repackaging.');
        // REPACKAGE
        const archive = archiver('zip', { zlib: { level: 9 }});
        const stream = createWriteStream(`${Bun.env.MIFOLDER}/package.nw`);
        archive.on('warning', warn => console.log('[MIML]', warn));
        archive.on('error', err => {throw err});
        archive.pipe(stream);
        archive.directory(`${Bun.env.MIFOLDER}/package-tmp/`, false);
        archive.finalize();
        console.log('[MIML]', 'Repackaged.');

        console.log('[MIML]', 'Deleting tmp package.');
        rmdirSync(`${Bun.env.MIFOLDER}/package-tmp/`, { recursive: true });
        console.log('[MIML]', 'Deleted.');

        console.log('[MIML]', 'Starting game.');
    }
    
} else {
    console.log('[MIML]', 'No mods found');
}

const app = Bun.spawn({
    cmd: [`${Bun.env.MIFOLDER}/Moonstone\ Island`],
    stdout: "pipe",
    stderr: "pipe",
})

app.stdout.pipeTo(new WritableStream({
    write(chunk) {
        console.log('[MIML | stdout]', Buffer.from(chunk).toString())
    }
}))
app.stderr.pipeTo(new WritableStream({
    write(chunk) {
        console.log('[MIML | stderr]', Buffer.from(chunk).toString())
    }
}));

process.on('SIGINT', () => {
    console.log('[MIML] Killing main process');
    rmdirSync(`${Bun.env.MIFOLDER}/bundle/`, { recursive: true });
    rmdirSync(`${Bun.env.MIFOLDER}/package-tmp/`, { recursive: true });
    app.kill();
    process.exit(0);
});