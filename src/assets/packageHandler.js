const compressing = require('compressing');
const path = require('path');

const gamePath = process.cwd();

exports.packagenw = packagenw = {
    decompress: async () => {await compressing.zip.uncompress(path.join(gamePath, 'game/package.nw'), path.join(gamePath, 'tmp-package'))},
    compress:  async () => {await compressing.zip.compressDir(path.join(gamePath, 'tmp-package'), path.join(gamePath, 'game/package.nw'), {ignoreBase: true})}

}