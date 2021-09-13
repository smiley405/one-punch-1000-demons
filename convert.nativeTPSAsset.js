/**
 * Extract only the essential spritesheet's data from texture packer's exported json file.
 * And output it to game-assets.js file.
 * See media/images/game-assets.json & media/images/game-assets.js to compare the difference.
 */
import {loadJsonFile} from "load-json-file";
import fs from "fs"

const dir = "./media/images/";
const file = "game-assets";
const jsonExtension = ".json";
const jsExtension = ".js";
const jsonFile = dir + file + jsonExtension;
const outFile = dir + file + jsExtension;
const jsonObject = await loadJsonFile(jsonFile);
const extractedObject = {};

for (let key in jsonObject.frames) {
    extractedObject[key] = jsonObject.frames[key].frame;
}

const newGameAssetsData = `export var gameAssets = ${JSON.stringify(extractedObject, null, 4)};`; 

fs.writeFile(outFile, newGameAssetsData, function (err) {
    if (err) return console.log(err);
    console.log("Successfully converted Texture Packer's JSON spritesheet data to native game-asset.");
    console.log(`original json file >> ${jsonFile} \noutput file >> ${outFile}`);
});