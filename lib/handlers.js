// Request handlers shared by the Vercel functions (api/) and server.js.
// Both call them with Node's (req, res) pair.

import {XbloomError, getSharedRecipe, isHexColor, recolor, shareIdFrom} from "./xbloom.js";

// Saves create recipes in the site's account, so they are rate limited.
// In-memory, so per server instance: fine for a small personal site.
const LIMITS = {perIp: 10, global: 100, windowMs: 60 * 60 * 1000};
const hits = new Map(); // key -> timestamps

function limited(key, max) {
    const now = Date.now();
    const recent = (hits.get(key) || []).filter((t) => now - t < LIMITS.windowMs);
    if (recent.length >= max) {
        hits.set(key, recent);
        return true;
    }
    recent.push(now);
    hits.set(key, recent);
    return false;
}

function clientIp(req) {
    const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
    return forwarded || req.socket?.remoteAddress || "unknown";
}

function send(res, status, body) {
    res.statusCode = status;
    res.setHeader("content-type", "application/json");
    res.setHeader("cache-control", "no-store");
    res.end(JSON.stringify(body));
}

async function readJson(req) {
    // Vercel parses JSON bodies for us; plain Node does not.
    if (req.body && typeof req.body === "object") {
        return req.body;
    }
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
        size += chunk.length;
        if (size > 10_000) {
            throw new XbloomError("Request too large.", 413);
        }
        chunks.push(chunk);
    }
    try {
        return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
    } catch {
        throw new XbloomError("Invalid JSON.", 400);
    }
}

function fail(res, err) {
    if (err instanceof XbloomError) {
        return send(res, err.status, {error: err.message});
    }
    console.error("unexpected error:", err?.message);
    return send(res, 500, {error: "Something went wrong."});
}

/** POST {link} -> {recipe} */
export async function handleRecipe(req, res) {
    if (req.method !== "POST") {
        return send(res, 405, {error: "Use POST."});
    }
    try {
        const {link} = await readJson(req);
        const recipe = await getSharedRecipe(shareIdFrom(link));
        return send(res, 200, {recipe});
    } catch (err) {
        return fail(res, err);
    }
}

/** POST {link, color} -> {shareUrl, reused} */
export async function handleSave(req, res) {
    if (req.method !== "POST") {
        return send(res, 405, {error: "Use POST."});
    }
    try {
        const {link, color} = await readJson(req);
        if (!isHexColor(color)) {
            throw new XbloomError("Colour must be a #RRGGBB hex value.", 400);
        }
        // Re-read the recipe here rather than trusting the browser's copy, so
        // the site's account only ever holds real xBloom recipes.
        const recipe = await getSharedRecipe(shareIdFrom(link));
        if (!recipe.pours.length) {
            throw new XbloomError("That recipe has no pours.", 400);
        }
        if (limited(`ip:${clientIp(req)}`, LIMITS.perIp) || limited("global", LIMITS.global)) {
            throw new XbloomError("Too many saves. Try again in an hour.", 429);
        }
        return send(res, 200, await recolor(recipe, color));
    } catch (err) {
        return fail(res, err);
    }
}
