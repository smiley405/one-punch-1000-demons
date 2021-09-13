import esbuild from "esbuild";

const port = 7000;

esbuild
    .serve(
        {
            port,
            servedir: "."
        },
        {
            entryPoints: ["./src/main.js"],
            bundle: true,
            outfile: "./game.min.js",
            sourcemap: "inline",
            target: "es5"
        }
    )
    .then(() => {
        console.log(`serve running at: http://localhost:${port}`);
    })
    .catch(() => process.exit(1));