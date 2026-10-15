// design/states/open-error.js: a link that can't be opened, with the server's message under the field. Mock data only.
const form = document.getElementById("open-form");
if (!form) return;
window.fetch = async () =>
  new Response(JSON.stringify({ error: "That link has no recipe id in it." }), { status: 400, headers: { "content-type": "application/json" } });
form.elements.link.value = "https://share-h5.xbloom.com/?x=1";
form.requestSubmit();
await new Promise((r) => setTimeout(r, 300));
