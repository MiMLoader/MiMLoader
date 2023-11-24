import compressing from "compressing";
import path from "path";

const gamePath = process.cwd();

const decompress = async () => {await compressing.zip.uncompress(path.join(gamePath, 'package.nw'), path.join(gamePath, 'tmp-package'))};

const compress =  async () => {await compressing.zip.compressDir(path.join(gamePath, 'tmp-package'), path.join(gamePath, 'package.nw'), {ignoreBase: true})};


export {
    decompress,
    compress
};