// schreibt index.json neu: alle *.bkhaus.json in diesem ordner (aufruf: node haeuser/index-erzeugen.mjs, oder doppelklick auf index-erzeugen.cmd)
import { readdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
const ordner = path.dirname(fileURLToPath(import.meta.url));
const dateien = readdirSync(ordner).filter(n => n.endsWith(".bkhaus.json")).sort();
writeFileSync(path.join(ordner, "index.json"), JSON.stringify(dateien, null, 1) + "\n");
console.log(dateien.length + " häuser in index.json");
