// Standalone server for hosting on your own machine or VPS (not needed on Vercel).
//   node server.js            -> http://localhost:3000
//   PORT=8080 node server.js

import {createServer} from "node:http";
import {readFile} from "node:fs/promises";
import {extname, join, normalize} from "node:path";
import {fileURLToPath} from "node:url";

import {handleRecipe, handleSave} from "./lib/handlers.js";

const PUBLIC = fileURLToPath(new URL("./public/", import.meta.url));
const TYPES = {".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript",
    ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon"};

const server = createServer(async (req, res) => {
    const path = new URL(req.url, "http://localhost").pathname;
    if (path === "/api/recipe") {
        return handleRecipe(req, res);
    }
    if (path === "/api/save") {
        return handleSave(req, res);
    }

    const file = normalize(join(PUBLIC, path === "/" ? "index.html" : path));
    if (!file.startsWith(PUBLIC)) {
        res.statusCode = 403;
        return res.end();
    }
    try {
        const body = await readFile(file);
        res.setHeader("content-type", TYPES[extname(file)] || "application/octet-stream");
        res.end(body);
    } catch {
        res.statusCode = 404;
        res.end("Not found");
    }
});

const port = Number(process.env.PORT) || 3000;
server.listen(port, () => console.log(`xBloom Recolor on http://localhost:${port}`));
