// design/states/recent-folded.js: a remembered recipe reopened; the list folds into one row above the editor. Mock data only.
if (!document.getElementById("recent")) return;
const DAY = 864e5, now = Date.now();
localStorage.setItem("recent", JSON.stringify([
  { link: "https://share-h5.xbloom.com/?id=example-1", name: "Sample Guji (made-up recipe)", cup: "Omni", pours: 4, color: "#B583CE", at: now },
  { link: "https://share-h5.xbloom.com/?id=example-2", name: "Morning Kenya (made-up)", cup: "Tea", pours: 3, color: "#F2C14E", at: now - DAY },
  { link: "https://share-h5.xbloom.com/?id=example-3", name: "Iced Ethiopia with a long made-up name that has to be cut", cup: "Omni", pours: 5, color: "#3FB8AF", at: now - 3 * DAY },
  { link: "https://share-h5.xbloom.com/?id=example-4", name: "Decaf Colombia (made-up)", cup: "Other", pours: 2, color: "#E3C3A8", at: now - 9 * DAY },
  { link: "https://share-h5.xbloom.com/?id=example-5", name: "Panama Geisha (made-up)", cup: "Omni", pours: 4, color: "#1F3A5F", at: now - 20 * DAY },
  { link: "https://share-h5.xbloom.com/?id=example-6", name: "Brazil Natural (made-up)", cup: "Omni", pours: 3, color: "#8B5A3C", at: now - 30 * DAY },
]));
renderRecent();
const recipe = {
  theName: "Morning Kenya (made-up)", cupTypeName: "Tea", dose: 15, grandWater: 15, theColor: "#F2C14E",
  isSetGrinderSize: 1, grinderSize: 40, rpm: 80,
  pours: [
    { theName: "", volume: 60, temperature: 92, flowRate: 3, pattern: 2, pausing: 30 },
    { theName: "", volume: 80, temperature: 92, flowRate: 3.2, pattern: 3, pausing: 20 },
    { theName: "", volume: 85, temperature: 90, flowRate: 3.5, pattern: 1, pausing: 0 },
  ],
};
window.fetch = async () => new Response(JSON.stringify({ recipe }), { status: 200, headers: { "content-type": "application/json" } });
document.querySelectorAll(".recent-open")[1].click();
await new Promise((r) => setTimeout(r, 300));
