import * as fs from "fs";
function checkRepeated(list) {
  const repeated = list.filter((item, index) => list.indexOf(item) !== index);
  return repeated;
}

function main() {
  const listUnparsed = fs.readFileSync("./productsInfo.txt", "utf8");

  if (!listUnparsed) {
    console.log("No data found");
    return;
  }
  const list = JSON.parse(listUnparsed);
  const repeated = checkRepeated(list);
  if (repeated.length > 0) {
    console.log("Repeated elements found: ", repeated);
  } else {
    console.log("No repeated elements found");
  }
}

main();
