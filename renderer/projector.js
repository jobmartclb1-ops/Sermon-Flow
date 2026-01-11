const path = require("path");
const fs = require("fs");

const bgEl = document.getElementById("bg");
const contentEl = document.getElementById("content");
const headerEl = document.getElementById("header");
const textEl = document.getElementById("text");
const slideEl = document.getElementById("slide");

function pickBackground() {
  const dir = path.join(__dirname, "..", "assets", "backgrounds");
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir).filter(f => /\.(png|jpg|jpeg|webp)$/i.test(f));
  if (!files.length) return null;
  const f = files[Math.floor(Math.random() * files.length)];
  return `file://${path.join(dir, f).replace(/\\/g, "/")}`;
}

function setBackground() {
  const bg = pickBackground();
  if (bg) bgEl.style.backgroundImage = `url("${bg}")`;
  else bgEl.style.backgroundImage = "none";
}

function showVerse(payload) {
  slideEl.classList.add("hidden");
  contentEl.style.display = "flex";

  setBackground();

  headerEl.textContent = payload.header || "";

  const safeText = (payload.text || "").trim();
  const formatted = safeText
    .replace(/\n(\d+)\s/g, (_m, n) => `\n<span class="vnum">${n}</span> `)
    .replace(/^(\d+)\s/g, (_m, n) => `<span class="vnum">${n}</span> `)
    .replace(/\n/g, "<br/>");

  textEl.innerHTML = formatted;
}

function showSlide(payload) {
  contentEl.style.display = "none";
  bgEl.style.backgroundImage = "none";
  slideEl.classList.remove("hidden");
  slideEl.src = payload.slideUrl;
}

function clearAll() {
  contentEl.style.display = "none";
  slideEl.classList.add("hidden");
  bgEl.style.backgroundImage = "none";
  headerEl.textContent = "";
  textEl.textContent = "";
}

window.SermonFlow.onProjectorShow((payload) => {
  if (!payload || !payload.kind) return;

  if (payload.kind === "BLACK") return clearAll();
  if (payload.kind === "SLIDE") return showSlide(payload);
  if (payload.kind === "VERSE") return showVerse(payload);
});

window.SermonFlow.onProjectorClear(() => clearAll());

// Init
setBackground();
