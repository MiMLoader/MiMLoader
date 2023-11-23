import console from "./assets/console";
import fs from "fs";

const gamePath = process.cwd();

console.log(`Module import ${Bun.nanoseconds()/1000000}ms`);

console.log(fs.readdirSync(gamePath));
if (fs.readdirSync(gamePath).length === 1) {
    console.log('Performing first time setup...');
}

console.log(`Launch took ${Bun.nanoseconds()/1000000}ms`);