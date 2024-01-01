const chalk = require('chalk');

const ogConsole = console;

exports.console = console = {
	...console,
	log: (...args) => {
		args.unshift(chalk.cyan.bold('[MIML]'));
		ogConsole.log(...args);
	},
	error: (...args) => {
		args.unshift(chalk.red.bold.underline('[MIML]'));
		ogConsole.error(...args);
	},
	warn: (...args) => {
		args.unshift(chalk.yellow.bold.underline('[MIML]'));
		ogConsole.warn(...args);
	},
};