import base64Img from "base64-img";
import fs from "fs"


const inFile = "media/images/game-assets.png";
const outFile = "media/images/gameImageBase64.js";


base64Img.base64(inFile, (err, data)=> {
    if(err) {
        console.log(error); // Logs an error if there was one
        return;
    }
    const imageBase64 = `export var gameImageBase64 = "${data}";`; 

    fs.writeFile(outFile, imageBase64, function (err) {
        if (err) return console.log(err);
        console.log("Successfully converted image to base64.");
        console.log(`output file >> ${outFile}`);
    });

});