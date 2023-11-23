import chalk from 'chalk';

const ogConsole = console;

export default console = {
    ...console,
    log: (...args: any[]) => {
        args.unshift(chalk.cyan.bold('[MIML]'));
        ogConsole.log(...args);
    },
    error: (...args: any[]) => {
        args.unshift(chalk.red.bold.underline('[MIML]'));
        ogConsole.error(...args);
    },
    warn: (...args: any[]) => {
        args.unshift(chalk.yellow.bold.underline('[MIML]'));
        ogConsole.warn(...args);
    },
};