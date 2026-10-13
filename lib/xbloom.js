// Minimal client for xBloom's unofficial cloud API.
//
// Protocol details come from the community projects xbloom-py
// (github.com/Alshekhi/xbloom-py) and XBRecipeWriterPlus
// (github.com/hessius/XBRecipeWriterPlus). Nothing here is documented by
// xBloom, so it can break whenever they change their backend.

import {constants, createPublicKey, publicEncrypt} from "node:crypto";

const BASE = "https://client-api.xbloom.com";

// xBloom's public key. Bodies of the authenticated `tu*` endpoints are
// RSA-encrypted with it. The irregular line wrapping is upstream; keep it.
const PUBLIC_KEY = createPublicKey(`-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC4LF40GZ72SdhMyl765K/i4nY5
CPcHz2Q1IKWKZ9S79xmK7G8pUhbVf4EZLvnNF1+9IvOFQUKV5Z7ZNNviqSpnql9
tAT+8+J/He0R7pcirvVSxgdr2i9V/C/gmqAEZ5qVTzRnd3uWdFoKzPdEBxP0Ipor
J1VBbCv90yBSOhVxO+QIDAQAB
-----END PUBLIC KEY-----`);

// 128-byte modulus minus 11 bytes of PKCS#1 v1.5 padding.
const CHUNK = 117;

// The Referer is required; it is why this can't run in the browser.
const HEADERS = {
    "content-type": "application/json",
    accept: "application/json, text/plain, */*",
    Referer: "https://share-h5.xbloom.com/",
    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) " +
        "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
};

const ENVELOPE = {
    interfaceVersion: 20240918,
    skey: "testskey",
    phoneType: "Android",
    clientType: 2,
    languageType: 0
};

export const CUP_TYPE_NAMES = {1: "xPod", 2: "Omni", 3: "Other", 4: "Tea"};

export class XbloomError extends Error {
    constructor(message, status = 502) {
        super(message);
        this.status = status;
    }
}

function encrypt(body) {
    const bytes = Buffer.from(JSON.stringify(body), "utf8");
    const blocks = [];
    for (let i = 0; i < bytes.length; i += CHUNK) {
        blocks.push(publicEncrypt(
            {key: PUBLIC_KEY, padding: constants.RSA_PKCS1_PADDING},
            bytes.subarray(i, i + CHUNK)
        ));
    }
    return Buffer.concat(blocks).toString("base64");
}

async function post(path, body, {encrypted = false} = {}) {
    let res;
    try {
        res = await fetch(`${BASE}/${path}`, {
            method: "POST",
            headers: HEADERS,
            // Encrypted calls send the base64 ciphertext as a bare JSON string.
            body: JSON.stringify(encrypted ? encrypt(body) : body)
        });
    } catch {
        throw new XbloomError("Could not reach xBloom.");
    }
    if (!res.ok) {
        throw new XbloomError(`xBloom returned HTTP ${res.status}.`);
    }
    return res.json();
}

function reason(resp) {
    return resp?.info || resp?.msg || resp?.message || "unknown error";
}

/** Pull the `id` out of a share-h5.xbloom.com link (or accept a bare id). */
export function shareIdFrom(input) {
    const text = String(input || "").trim();
    if (!text) {
        throw new XbloomError("Paste an xBloom share link.", 400);
    }
    if (!/^https?:\/\//i.test(text)) {
        return text;
    }
    // Not URLSearchParams: ids are base64 and it would turn a raw "+" into a space.
    const raw = text.match(/[?&]id=([^&#]+)/)?.[1];
    let id = null;
    try {
        id = raw ? decodeURIComponent(raw) : null;
    } catch {
        id = raw;
    }
    if (!id) {
        throw new XbloomError("That link has no recipe id in it.", 400);
    }
    return id;
}

/** Fetch a recipe from its share id. Public endpoint, no login. */
export async function getSharedRecipe(shareId) {
    const resp = await post("RecipeDetail.html", {
        tableIdOfRSA: shareId,
        interfaceVersion: 19700101, // the share page uses this older value
        skey: "testskey"
    });
    if (resp?.result !== "success" || typeof resp.recipeVo !== "object") {
        throw new XbloomError(`Recipe not found (${reason(resp)}).`, 404);
    }
    return toRecipe(resp.recipeVo);
}

/**
 * Keep the raw cloud field names and units so the export is an exact copy:
 * `grandWater` is the ratio denominator (1:N), `flowRate` is in ml/s.
 */
function toRecipe(r) {
    const pours = (r.pourList || []).map((p) => ({
        theName: p.theName,
        volume: p.volume,
        temperature: p.temperature,
        flowRate: p.flowRate,
        pattern: p.pattern,
        pausing: p.pausing,
        isEnableVibrationBefore: p.isEnableVibrationBefore,
        isEnableVibrationAfter: p.isEnableVibrationAfter
    }));
    return {
        theName: r.theName,
        theColor: r.theColor || "#C9D5B8",
        dose: r.dose,
        grandWater: r.grandWater,
        grinderSize: r.grinderSize,
        isSetGrinderSize: r.isSetGrinderSize,
        rpm: r.rpm,
        cupType: r.cupType,
        cupTypeName: CUP_TYPE_NAMES[r.cupType] || r.cupTypeName || "Other",
        isEnableBypassWater: r.isEnableBypassWater ?? 2,
        bypassTemp: r.bypassTemp ?? 85,
        bypassVolume: r.bypassVolume ?? 0,
        adaptedModel: r.adaptedModel ?? 1,
        pourCount: pours.length || r.pourCount,
        pours
    };
}

export function isHexColor(value) {
    return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}

// -------------------------------------------------------------------------
// Service account
//
// Recoloured copies are saved into one xBloom account that the site owns,
// configured via XBLOOM_EMAIL / XBLOOM_PASSWORD. Users never log in.
// -------------------------------------------------------------------------

// xBloom's two ways of saying "token expired, sign in again".
const EXPIRED_CODES = new Set([10001, 20003]);
const PAGE_SIZE = 20;
const MAX_PAGES = 25;

let session = null; // {memberId, token}, reused while the instance stays warm

function isExpired(resp) {
    return [resp?.code, resp?.resultCode, resp?.errorCode].some((c) => EXPIRED_CODES.has(Number(c)));
}

async function login() {
    const email = process.env.XBLOOM_EMAIL;
    const password = process.env.XBLOOM_PASSWORD;
    if (!email || !password) {
        throw new XbloomError("Server is not configured (XBLOOM_EMAIL / XBLOOM_PASSWORD).", 503);
    }
    const resp = await post("tMemberLogin.thtml", {...ENVELOPE, email, password, jpushId: ""});
    const memberId = resp?.member?.tableId;
    if (resp?.result !== "success" || memberId == null || !resp.token) {
        // Never echo xBloom's message here: it is about the site's own account.
        console.error("service account login failed:", reason(resp));
        throw new XbloomError("The site's xBloom account could not log in.", 503);
    }
    session = {memberId, token: resp.token};
    return session;
}

/** An authenticated, encrypted call that logs in again once if the token expired. */
async function authed(path, body) {
    const auth = session || await login();
    let resp = await post(path, {...ENVELOPE, ...auth, ...body}, {encrypted: true});
    if (isExpired(resp)) {
        const fresh = await login();
        resp = await post(path, {...ENVELOPE, ...fresh, ...body}, {encrypted: true});
    }
    return resp;
}

/** Everything that defines the brew plus the colour; two equal keys are the same copy. */
function fingerprint(r) {
    return JSON.stringify([
        r.theName, String(r.theColor).toUpperCase(), r.dose, r.grandWater, r.grinderSize,
        r.isSetGrinderSize, r.rpm, r.cupType, r.adaptedModel, r.isEnableBypassWater,
        r.pours.map((p) => [p.volume, p.temperature, p.flowRate, p.pattern, p.pausing,
            p.isEnableVibrationBefore, p.isEnableVibrationAfter])
    ], (_, v) => (typeof v === "string" && v.trim() !== "" && !isNaN(v) ? Number(v) : v));
}

/** Walk the service account's recipes until `match` returns true. */
async function findOwnRecipe(adaptedModel, match) {
    for (let pageNumber = 1; pageNumber <= MAX_PAGES; pageNumber++) {
        const resp = await authed("tuMyTeaRecipeCreated.tuhtml", {
            pageNumber, countPerPage: PAGE_SIZE, adaptedModel
        });
        if (resp?.result !== "success") {
            throw new XbloomError(`Could not list recipes (${reason(resp)}).`);
        }
        const rows = resp.list || [];
        const row = rows.find((r) => {
            try {
                return match(r);
            } catch {
                return false;
            }
        });
        if (row) {
            return row;
        }
        if (rows.length < PAGE_SIZE) {
            return null;
        }
    }
    return null;
}

/**
 * Recolour `recipe` (from getSharedRecipe) and return a share link to the copy.
 * If this exact recipe in this exact colour was saved before, its link is
 * reused instead of adding another copy to the account.
 */
export async function recolor(recipe, color) {
    const wanted = {...recipe, theColor: color.toUpperCase()};
    const key = fingerprint(wanted);

    const existing = await findOwnRecipe(wanted.adaptedModel, (r) => fingerprint(toRecipe(r)) === key);
    if (existing?.shareRecipeLink) {
        return {shareUrl: existing.shareRecipeLink, reused: true};
    }

    const created = await authed("tuRecipeAdd.tuhtml", {
        theName: wanted.theName,
        theColor: wanted.theColor,
        dose: wanted.dose,
        grandWater: wanted.grandWater,
        grinderSize: wanted.grinderSize,
        isSetGrinderSize: wanted.isSetGrinderSize,
        rpm: wanted.rpm,
        cupType: wanted.cupType,
        isEnableBypassWater: wanted.isEnableBypassWater,
        bypassTemp: wanted.bypassTemp,
        bypassVolume: wanted.bypassVolume,
        adaptedModel: wanted.adaptedModel,
        subSetType: 2,
        theSubsetId: 0,
        appPlace: [4],
        isShortcuts: 2,
        pourCount: wanted.pours.length,
        pourDataJSONStr: JSON.stringify(wanted.pours),
        createTimeStamp: Date.now()
    });
    const tableId = created?.tableId;
    if (created?.result !== "success" || tableId == null) {
        throw new XbloomError(`xBloom rejected the recipe (${reason(created)}).`);
    }

    // The create response has no share link; read it off the new row.
    const row = await findOwnRecipe(wanted.adaptedModel, (r) => String(r.tableId) === String(tableId));
    if (!row?.shareRecipeLink) {
        throw new XbloomError("Saved, but xBloom did not return a share link. Try again.");
    }
    return {shareUrl: row.shareRecipeLink, reused: false};
}
