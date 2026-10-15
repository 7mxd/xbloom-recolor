// design/states/theme-switched.js: the theme button pressed once (light becomes dark, dark becomes light), which overrides the
// system setting with data-theme on <html>.
const toggle = document.getElementById("theme-toggle");
if (!toggle) return;
toggle.click();
// The page remembers the choice; forget it so later screenshots follow the system setting again.
localStorage.removeItem("theme");
