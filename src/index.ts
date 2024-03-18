console.clear();

import { startUp } from './lib';

console.log('Starting MiMLoader');
console.time('Started');

startUp();

console.timeEnd('Started');
