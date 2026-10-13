// Runs against a fake xBloom (global fetch is stubbed); no network.
import {test, beforeEach} from "node:test";
import assert from "node:assert/strict";

process.env.XBLOOM_EMAIL = "service@example.com";
process.env.XBLOOM_PASSWORD = "secret";

const {getSharedRecipe, recolor, shareIdFrom} = await import("../lib/xbloom.js");

const RAW = {
    tableId: 7, theName: "Iced 90G", theColor: "#C9D5B8", dose: 16, grandWater: 8.5, grinderSize: 55,
    isSetGrinderSize: 1, rpm: 120, cupType: 2, cupTypeName: "Omni Dripper", isEnableBypassWater: 2,
    adaptedModel: 1, pourCount: 2, shareRecipeLink: "https://share-h5.xbloom.com/?id=ORIG",
    pourList: [
        {theName: "Bloom", volume: 40, temperature: 93, flowRate: 3, pattern: 2, pausing: 30,
            isEnableVibrationBefore: 2, isEnableVibrationAfter: 1},
        {theName: "Pour 2", volume: 96, temperature: 93, flowRate: 3.5, pattern: 3, pausing: 0,
            isEnableVibrationBefore: 2, isEnableVibrationAfter: 2}
    ]
};

let calls, rows, expireNextList;

function respond(body) {
    return {ok: true, status: 200, json: async () => body};
}

beforeEach(() => {
    calls = [];
    rows = [];
    expireNextList = false;
    globalThis.fetch = async (url) => {
        const path = url.split("/").pop();
        calls.push(path);
        switch (path) {
            case "RecipeDetail.html":
                return respond({result: "success", recipeVo: structuredClone(RAW)});
            case "tMemberLogin.thtml":
                return respond({result: "success", member: {tableId: 1}, token: `t${calls.length}`});
            case "tuMyTeaRecipeCreated.tuhtml":
                if (expireNextList) {
                    expireNextList = false;
                    return respond({result: "fail", resultCode: 20003, info: "expired"});
                }
                return respond({result: "success", list: rows});
            case "tuRecipeAdd.tuhtml": {
                const tableId = 100 + rows.length;
                rows.push({...structuredClone(RAW), tableId, theColor: "#D9302C",
                    shareRecipeLink: `https://share-h5.xbloom.com/?id=NEW${tableId}`});
                return respond({result: "success", tableId});
            }
        }
        throw new Error(`unexpected ${path}`);
    };
});

test("share ids keep base64 '+' whether or not the link is encoded", () => {
    assert.equal(shareIdFrom("https://share-h5.xbloom.com/?id=ab+c%3D%3D"), "ab+c==");
    assert.equal(shareIdFrom("https://share-h5.xbloom.com/?id=ab%2Bc=="), "ab+c==");
});

test("a new colour creates a copy and returns its link", async () => {
    const recipe = await getSharedRecipe("ORIG");
    const out = await recolor(recipe, "#d9302c");
    assert.deepEqual(out, {shareUrl: "https://share-h5.xbloom.com/?id=NEW100", reused: false});
    assert.ok(calls.includes("tuRecipeAdd.tuhtml"));
});

test("saving the same recipe and colour again reuses the existing copy", async () => {
    const recipe = await getSharedRecipe("ORIG");
    await recolor(recipe, "#D9302C");
    calls = [];
    const out = await recolor(recipe, "#D9302C");
    assert.equal(out.reused, true);
    assert.equal(out.shareUrl, "https://share-h5.xbloom.com/?id=NEW100");
    assert.ok(!calls.includes("tuRecipeAdd.tuhtml"));
});

test("an expired token triggers one re-login", async () => {
    const recipe = await getSharedRecipe("ORIG");
    expireNextList = true;
    calls = [];
    await recolor(recipe, "#4A90F0");
    assert.deepEqual(calls.slice(0, 3),
        ["tuMyTeaRecipeCreated.tuhtml", "tMemberLogin.thtml", "tuMyTeaRecipeCreated.tuhtml"]);
});
