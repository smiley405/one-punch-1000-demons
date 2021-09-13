import esbuild from "esbuild";
import read from "read-file";
import write from "write";
import minifyHtml from "html-minifier-terser";
import { zip } from "zip-a-folder";
import fs from "fs/promises";
import shell from "shelljs";

const cssFile = "game.css";
const htmlFile = "index.html";
const outDir = "./out";
const distDir = "./dist";
const outFile = outDir + "/" + htmlFile;
const zipFile =  distDir + "/game.zip"
let bundle = "";

await esbuild
    .build({
        entryPoints: ["src/main.js"],
        bundle: true,
        write: false,
        minify: false,
        target: "es5"
    })
    .then((result) => {
        bundle = result.outputFiles[0].text;
    })
    .catch(() => process.exit(1));

const cssFileRawData = read.sync(cssFile, "utf8");
const htmlFileRawData = read.sync(htmlFile, "utf8");

let injectedHtmlFile = htmlFileRawData.replace(/<!--inject-start-css-->[\s\S]*<!--inject-end-css-->/g, `<style>\n${cssFileRawData}</style>`);
injectedHtmlFile = injectedHtmlFile.replace(/<!--inject-start-js-->[\s\S]*<!--inject-end-js-->/g, `<script>\n${bundle}</script>`);

const minifiedHtml = await minifyHtml.minify(injectedHtmlFile, {
    minifyCSS: true,
    minifyJS: true,
    collapseWhitespace: true
});
write(outFile, minifiedHtml, err=> {
    if(!err) {
        console.log(`***minified file generated at ${outFile}***`);
    }
});
await fs.mkdir(distDir, { recursive: true }, (err) => {
    if (err) throw err;
});
await zip(outDir, zipFile);
console.log(`***zip file to ${zipFile}***`);

// after this use advzip to further recompress //
// **must have advzip installed globally to use the following command//
// execute shell command
const cmd_to_run = `advzip -z -4 ${zipFile}`;
console.log(cmd_to_run);
if (shell.exec(cmd_to_run).code !== 0) {
    shell.echo("Error: " + cmd_to_run + " failed");
    shell.exit(1);
}
shell.echo("Task completed!!! \n");
