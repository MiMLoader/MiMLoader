import { merge } from 'merge-anything';

let originalArray = await Bun.file('./craftingArray.json').json();
let moddedArray = await Bun.file('./craftingArray edited.json').json();

let mergedArray = merge(originalArray, moddedArray);

await Bun.write('./mergedArray.json', JSON.stringify(mergedArray, null, 4));