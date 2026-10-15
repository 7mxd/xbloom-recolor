// design/states/custom-colour.js: a recipe opened, with Custom colour open (the card preview and the sliders people move together).
// Mock data only: fetch is answered here, nothing reaches xBloom.
const form = document.getElementById("open-form");
if (!form) return;
const recipe = {
  theName: "Sample Guji (made-up recipe)", cupTypeName: "Omni", dose: 15, grandWater: 13.3, theColor: "#B583CE",
  isSetGrinderSize: 1, grinderSize: 37, rpm: 60,
  pours: [
    { theName: "", volume: 60, temperature: 90, flowRate: 3, pattern: 2, pausing: 36 },
    { theName: "", volume: 47, temperature: 89, flowRate: 3.2, pattern: 3, pausing: 20 },
    { theName: "", volume: 100, temperature: 88, flowRate: 3.5, pattern: 1, pausing: 16 },
    { theName: "", volume: 46, temperature: 87, flowRate: 3, pattern: 2, pausing: 0 },
  ],
};
window.fetch = async () => new Response(JSON.stringify({ recipe }), { status: 200, headers: { "content-type": "application/json" } });
form.elements.link.value = "https://share-h5.xbloom.com/?id=example";
form.requestSubmit();
await new Promise((r) => setTimeout(r, 300));
document.querySelector("details.advanced").open = true;
