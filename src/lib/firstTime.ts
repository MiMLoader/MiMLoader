import path from 'node:path';
import * as fs from 'fs-extra';

const firstTime = () => {
	// Do original game files exist?
	if (!fs.existsSync(path.join(process.cwd(), '../Moonstone Island')))
		throw new Error('Original game files not found');

	// Clear old game files
	if (fs.existsSync(path.join(process.cwd(), 'game')))
		fs.removeSync(path.join(process.cwd(), 'game'));

	// Copy original game files
	fs.copySync(
		path.join(process.cwd(), '../Moonstone Island'),
		path.join(process.cwd(), 'game'),
	);
};

export default firstTime;
