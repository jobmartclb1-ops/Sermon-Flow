const { contextBridge, ipcRenderer } = require("electron");
const Store = require("electron-store");

// Persistent settings
const store = new Store({
  name: "sermon-flow-settings",
  defaults: {
    apiBibleKey: "",
    defaultVersion: "NLT",
    overlayReturnMs: 60000,
    showVerseNumbers: true,
    bibleIdsByVersion: { KJV: "", NKJV: "", NLT: "", GNT: "" }
  }
});

const api = {
  // Remote actions
  onRemoteAction: (cb) =>
    ipcRenderer.on("remote-action", (_e, action) => cb(action)),

  // Projector messaging
  showOnProjector: (payload) => ipcRenderer.send("projector:show", payload),
  clearProjector: () => ipcRenderer.send("projector:clear"),
  onProjectorShow: (cb) =>
    ipcRenderer.on("projector:show", (_e, payload) => cb(payload)),
  onProjectorClear: (cb) =>
    ipcRenderer.on("projector:clear", () => cb()),

  // Settings window
  openSettings: () => ipcRenderer.send("settings:open"),

  // Persistent settings API
  settingsGet: (key) => store.get(key),
  settingsSet: (key, value) => store.set(key, value),
  settingsAll: () => store.store,

  // API.Bible helper
  apiBibleFetch: async (url) => {
    const key = store.get("apiBibleKey");
    if (!key) throw new Error("API.Bible key is not set.");
    const res = await fetch(url, { headers: { "api-key": key } });
    if (!res.ok)
      throw new Error(`API.Bible error ${res.status}: ${await res.text()}`);
    return await res.json();
  }
};

// ✅ Works in BOTH modes (isolated or not)
if (process.contextIsolated) {
  contextBridge.exposeInMainWorld("SermonFlow", api);
} else {
  window.SermonFlow = api;
}
