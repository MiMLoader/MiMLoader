import path from 'node:path';
import * as fs from 'fs-extra';
import { firstTime } from '.';

const args = process.argv.slice(2);

const startUp = () => {
	if (fs.existsSync(path.join(process.cwd(), 'tmp-package')))
		fs.removeSync(path.join(process.cwd(), 'tmp-package'));

	// Check mods folder
	fs.ensureDir(path.join(process.cwd(), 'mods')).catch((err) => {
		throw new Error(err);
	});

	// First time?
	if (
		!fs.existsSync(path.join(process.cwd(), 'game')) ||
		args.includes('--repatch')
	)
		firstTime();
};

export default startUp;
