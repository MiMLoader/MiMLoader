const file = await Bun.file("./cards.json").json();
const uniqueOptions: Set<string> = new Set();

const xIndex = 0;
// COME BACK TO 8

for (let zIndex = 0; zIndex < file.size[2]; zIndex++) {
  for (let yIndex = 0; yIndex < file.size[1]; yIndex++) {
    uniqueOptions.add(file.data[xIndex][yIndex][zIndex]);
  }
}

console.log(uniqueOptions);
