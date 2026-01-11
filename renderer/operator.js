const path = require("path");
const fs = require("fs");

let mode = "SLIDES";
let locked = false;

// Verse overlay timer
let overlayTimer = null;
let lastSlidesIndex = 0;

// Load persisted settings
const s = window.SermonFlow.settingsAll();
let currentVersion = s.defaultVersion || "NLT";
const OVERLAY_MS = s.overlayReturnMs || 60000;
const SHOW_VERSE_NUMBERS = (s.showVerseNumbers !== false);

// Slides
let slides = [];
let slideIndex = 0;

// Selected content for projector
let selected = { type: "NONE" };

const $ = (id) => document.getElementById(id);

function setMode(newMode) {
  mode = newMode;
  $("modeSlides").classList.toggle("active", mode === "SLIDES");
  $("modeBible").classList.toggle("active", mode === "BIBLE");
  $("slidesPane").classList.toggle("hidden", mode !== "SLIDES");
  $("biblePane").classList.toggle("hidden", mode !== "BIBLE");
}

function setVersion(ver) {
  currentVersion = ver;
  $("verPill").textContent = ver;
  setPreview(`Current Version: ${ver}`, "Ready.");
}

function setPreview(title, text) {
  $("previewTitle").textContent = title;
  $("previewText").textContent = text;
}

function loadSlides() {
  const slidesDir = path.join(__dirname, "..", "assets", "slides");
  if (!fs.existsSync(slidesDir)) {
    setPreview("No slides folder", "Create assets/slides and add 001.png, 002.png...");
    return;
  }

  const files = fs.readdirSync(slidesDir)
    .filter(f => /\.(png|jpg|jpeg|webp)$/i.test(f))
    .sort((a,b) => a.localeCompare(b, undefined, { numeric: true }));

  slides = files.map(f => ({
    file: f,
    url: `file://${path.join(slidesDir, f).replace(/\\/g, "/")}`
  }));

  const thumbs = $("thumbs");
  thumbs.innerHTML = "";

  slides.forEach((s, idx) => {
    const el = document.createElement("div");
    el.className = "thumb";
    el.innerHTML = `<div class="thumbNum">Slide ${idx+1}</div>
      <div class="small muted">${s.file}</div>`;
    el.onclick = () => {
      slideIndex = idx;
      selected = { type: "SLIDE", slideIndex };
      markActiveThumb();
      setPreview(`Slide ${idx+1}`, s.file);
    };
    thumbs.appendChild(el);
  });

  if (slides.length) {
    slideIndex = 0;
    selected = { type: "SLIDE", slideIndex: 0 };
    markActiveThumb();
    setPreview("Slides ready", `Loaded ${slides.length} slide images.`);
  } else {
    setPreview("No slides found", "Put slide images in assets/slides (001.png, 002.png...).");
  }
}

function markActiveThumb() {
  const thumbs = $("thumbs").children;
  for (let i=0;i<thumbs.length;i++) {
    thumbs[i].classList.toggle("active", i === slideIndex);
  }
}

function showSlide(idx) {
  if (!slides.length) return;
  slideIndex = Math.max(0, Math.min(slides.length - 1, idx));
  markActiveThumb();
  selected = { type: "SLIDE", slideIndex };
  setPreview(`Slide ${slideIndex+1}`, slides[slideIndex].file);

  window.SermonFlow.showOnProjector({
    kind: "SLIDE",
    slideUrl: slides[slideIndex].url
  });
}

function clearProjector() {
  window.SermonFlow.clearProjector();
  setPreview("Cleared", "Projector cleared.");
}

function startOverlayAutoReturn() {
  if (overlayTimer) clearTimeout(overlayTimer);
  overlayTimer = setTimeout(() => {
    showSlide(lastSlidesIndex);
  }, OVERLAY_MS);
}

async function ensureBibleIdForCurrentVersion() {
  const map = window.SermonFlow.settingsGet("bibleIdsByVersion") || {};
  if (map[currentVersion]) return map[currentVersion];

  // No ID for this version yet
  $("results").innerHTML = `
    <div class="resultItem">
      <div class="resultRef">Setup needed</div>
      <div class="resultSnippet">Open Settings → add your API.Bible key → choose a Bible ID for ${currentVersion}.</div>
    </div>
  `;
  return "";
}

async function searchBible(query) {
  const apiKey = window.SermonFlow.settingsGet("apiBibleKey");
  if (!apiKey) {
    $("results").innerHTML = `
      <div class="resultItem">
        <div class="resultRef">API key missing</div>
        <div class="resultSnippet">Open Settings → paste your API.Bible key → Save.</div>
      </div>
    `;
    return;
  }

  const bibleId = await ensureBibleIdForCurrentVersion();
  if (!bibleId) return;

  const url = `https://api.scripture.api.bible/v1/bibles/${encodeURIComponent(bibleId)}/search?query=${encodeURIComponent(query)}&limit=10&offset=0`;
  const data = await window.SermonFlow.apiBibleFetch(url);

  const results = $("results");
  results.innerHTML = "";

  // API returns verses with reference/text (often HTML)
  const verses = (data.data && data.data.verses) ? data.data.verses : [];
  if (!verses.length) {
    results.innerHTML = `<div class="resultItem"><div class="resultRef">No results</div><div class="resultSnippet">Try a different phrase or a reference.</div></div>`;
    return;
  }

  verses.forEach(v => {
    const ref = v.reference || "Verse";
    const text = (v.text || "").replace(/<[^>]+>/g, "").trim();
    const item = document.createElement("div");
    item.className = "resultItem";
    item.innerHTML = `<div class="resultRef">${ref} (${currentVersion})</div>
      <div class="resultSnippet">${text}</div>`;
    item.onclick = () => {
      selected = {
        type: "VERSE",
        ref,
        version: currentVersion,
        text
      };
      setPreview(`${ref} (${currentVersion})`, text);
    };
    results.appendChild(item);
  });
}

function projectSelected() {
  if (selected.type === "SLIDE") {
    lastSlidesIndex = selected.slideIndex;
    showSlide(selected.slideIndex);
    return;
  }

  if (selected.type === "VERSE") {
    lastSlidesIndex = slideIndex;

    window.SermonFlow.showOnProjector({
      kind: "VERSE",
      header: `${selected.ref} (${selected.version})`,
      text: selected.text,
      showVerseNumbers: SHOW_VERSE_NUMBERS,
      overlayReturnMs: OVERLAY_MS
    });

    startOverlayAutoReturn();
    return;
  }

  setPreview("Nothing selected", "Pick a slide or a verse first.");
}

// UI wiring
$("modeSlides").onclick = () => setMode("SLIDES");
$("modeBible").onclick = () => setMode("BIBLE");

$("btnProject").onclick = () => projectSelected();
$("btnNext").onclick = () => showSlide(slideIndex + 1);
$("btnPrev").onclick = () => showSlide(slideIndex - 1);

$("btnClear").onclick = () => clearProjector();

$("btnSettings").onclick = () => window.SermonFlow.openSettings();

$("btnBlack").onclick = () => {
  window.SermonFlow.showOnProjector({ kind: "BLACK" });
  setPreview("Black screen", "Projector is black.");
};

$("btnLock").onclick = () => {
  locked = !locked;
  $("btnLock").textContent = locked ? "Locked" : "Lock";
  setPreview(locked ? "Locked" : "Unlocked", locked ? "Auto changes blocked." : "Auto changes allowed.");
};

$("btnSearch").onclick = async () => {
  const q = $("searchBox").value.trim();
  if (!q) return;
  await searchBible(q);
};

// Remote actions from main (globalShortcut)
window.SermonFlow.onRemoteAction((action) => {
  $("remoteStatus").textContent = `Input: ${action}`;

  // Version hotkeys
  if (action === "SET_VER_KJV") return setVersion("KJV");
  if (action === "SET_VER_NKJV") return setVersion("NKJV");
  if (action === "SET_VER_NLT") return setVersion("NLT");
  if (action === "SET_VER_GNT") return setVersion("GNT");

  if (locked) return;

  if (action === "NEXT") return showSlide(slideIndex + 1);
  if (action === "PREV") return showSlide(slideIndex - 1);
  if (action === "CLEAR") return clearProjector();
});

// Init
setVersion(currentVersion);
setMode("SLIDES");
loadSlides();
if (slides.length) showSlide(0);
