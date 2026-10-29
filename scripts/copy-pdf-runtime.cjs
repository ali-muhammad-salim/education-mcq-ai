const fs = require("node:fs");
const path = require("node:path");
const packageFile = require.resolve("pdfjs-dist/package.json");
const source = path.dirname(packageFile);
const version = JSON.parse(fs.readFileSync(packageFile, "utf8")).version;
if (!/^[0-9.]+$/.test(version)) throw Error("Unexpected PDF runtime version");
const destination = path.join(process.cwd(), "public", "pdfjs", version);
fs.mkdirSync(destination, { recursive: true });
fs.copyFileSync(
  path.join(source, "build", "pdf.worker.min.mjs"),
  path.join(destination, "pdf.worker.min.mjs"),
);
for (const folder of ["cmaps", "standard_fonts", "wasm", "iccs"])
  fs.cpSync(path.join(source, folder), path.join(destination, folder), {
    recursive: true,
  });
fs.copyFileSync(
  path.join(source, "LICENSE"),
  path.join(destination, "LICENSE"),
);
