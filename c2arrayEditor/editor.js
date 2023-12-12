const fs = require('fs');
const path = require('path');

let args = process.argv.slice(2);
let file = args[0];

let dataJson = fs.readFileSync(path.join(__dirname, file), 'utf8');
dataJson = JSON.stringify(JSON.parse(dataJson).data);

dataJson = dataJson.replace(/(?<!")\s+(?!")/g, '')
    .replace(/\n/g, '')
    .replace(/\]\],\[\[/g, ']],\n[[')
    .replace(/\[+/g, '[')
    .replace(/\]+/g, ']');

fs.writeFileSync(`mod-${file.replace('json', 'csv')}`, dataJson);