const el = (id) => document.getElementById(id);

function setStatus(text) {
  el("testStatus").textContent = text;
}

function loadExisting() {
  const all = window.SermonFlow.settingsAll();

  el("apiKey").value = all.apiBibleKey || "";
  el("defaultVersion").value = all.defaultVersion || "NLT";
  el("verseNums").value = String(all.showVerseNumbers !== false);
  el("overlayMs").value = String(all.overlayReturnMs || 60000);

  const map = all.bibleIdsByVersion || {KJV:"",NKJV:"",NLT:"",GNT:""};
  el("selKJV").dataset.selected = map.KJV || "";
  el("selNKJV").dataset.selected = map.NKJV || "";
  el("selNLT").dataset.selected = map.NLT || "";
  el("selGNT").dataset.selected = map.GNT || "";
}

function fillSelect(sel, items, selectedId) {
  sel.innerHTML = "";
  const opt0 = document.createElement("option");
  opt0.value = "";
  opt0.textContent = "— Select —";
  sel.appendChild(opt0);

  for (const b of items) {
    const opt = document.createElement("option");
    opt.value = b.id;
    opt.textContent = `${b.name} (${b.abbreviation || ""})`;
    sel.appendChild(opt);
  }
  sel.value = selectedId || "";
}

async function testKey() {
  const key = el("apiKey").value.trim();
  window.SermonFlow.settingsSet("apiBibleKey", key);
  try {
    const data = await window.SermonFlow.apiBibleFetch("https://api.scripture.api.bible/v1/bibles");
    const count = (data.data || []).length;
    setStatus(`Success. Your key can see ${count} Bible entries.`);
  } catch (e) {
    setStatus(`Failed: ${e.message}`);
  }
}

async function loadBibles() {
  setStatus("Loading bibles…");
  try {
    const data = await window.SermonFlow.apiBibleFetch("https://api.scripture.api.bible/v1/bibles");
    const items = (data.data || []).slice().sort((a,b)=> (a.name||"").localeCompare(b.name||""));

    const selected = {
      KJV: el("selKJV").dataset.selected || "",
      NKJV: el("selNKJV").dataset.selected || "",
      NLT: el("selNLT").dataset.selected || "",
      GNT: el("selGNT").dataset.selected || ""
    };

    fillSelect(el("selKJV"), items, selected.KJV);
    fillSelect(el("selNKJV"), items, selected.NKJV);
    fillSelect(el("selNLT"), items, selected.NLT);
    fillSelect(el("selGNT"), items, selected.GNT);

    setStatus("Loaded. Now pick the correct Bible for each version.");
  } catch (e) {
    setStatus(`Failed: ${e.message}`);
  }
}

function saveAll() {
  window.SermonFlow.settingsSet("apiBibleKey", el("apiKey").value.trim());

  window.SermonFlow.settingsSet("defaultVersion", el("defaultVersion").value);
  window.SermonFlow.settingsSet("showVerseNumbers", el("verseNums").value === "true");
  window.SermonFlow.settingsSet("overlayReturnMs", parseInt(el("overlayMs").value, 10));

  window.SermonFlow.settingsSet("bibleIdsByVersion", {
    KJV: el("selKJV").value,
    NKJV: el("selNKJV").value,
    NLT: el("selNLT").value,
    GNT: el("selGNT").value
  });

  setStatus("Saved. You can close this window.");
}

el("btnTest").onclick = testKey;
el("btnLoad").onclick = loadBibles;
el("btnSave").onclick = saveAll;

loadExisting();
