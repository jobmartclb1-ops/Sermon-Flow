const { app, BrowserWindow, globalShortcut, screen, ipcMain } = require("electron");
const path = require("path");

let operatorWin = null;
let projectorWin = null;
let settingsWin = null;

function unregisterAllShortcuts() {
  try { globalShortcut.unregisterAll(); } catch {}
}

function registerSafeShortcuts() {
  // Only keys that won’t break typing
  const register = (accel, action) => {
    globalShortcut.register(accel, () => {
      if (operatorWin) operatorWin.webContents.send("remote-action", action);
    });
  };

  // Most clickers
  register("PageDown", "NEXT");
  register("PageUp", "PREV");

  // Clear projector
  register("Escape", "CLEAR");

  // Version switching
  register("F1", "SET_VER_KJV");
  register("F2", "SET_VER_NKJV");
  register("F3", "SET_VER_NLT");
  register("F4", "SET_VER_GNT");
}

function createOperatorAndProjector() {
  const displays = screen.getAllDisplays();
  const primary = screen.getPrimaryDisplay();
  const secondary = displays.find(d => d.id !== primary.id) || primary;

  operatorWin = new BrowserWindow({
    width: 1200,
    height: 780,
    title: "Sermon Flow — Operator",
    backgroundColor: "#0b0f17",
    webPreferences: { preload: path.join(__dirname, "preload.js") }
  });

  projectorWin = new BrowserWindow({
    x: secondary.bounds.x,
    y: secondary.bounds.y,
    width: secondary.bounds.width,
    height: secondary.bounds.height,
    title: "Sermon Flow — Projector",
    backgroundColor: "#000000",
    fullscreen: true,
    frame: false,
    alwaysOnTop: true,
    webPreferences: { preload: path.join(__dirname, "preload.js") }
  });

  operatorWin.loadFile(path.join(__dirname, "renderer", "operator.html"));
  projectorWin.loadFile(path.join(__dirname, "renderer", "projector.html"));

  operatorWin.on("closed", () => (operatorWin = null));
  projectorWin.on("closed", () => (projectorWin = null));

  // Register safe shortcuts ONLY while Sermon Flow is in use
  operatorWin.on("focus", () => {
    unregisterAllShortcuts();
    registerSafeShortcuts();
  });

  operatorWin.on("blur", () => {
    // Stop capturing keys when you click away from the app
    unregisterAllShortcuts();
  });
}

function openSettingsWindow() {
  if (settingsWin) { settingsWin.focus(); return; }

  settingsWin = new BrowserWindow({
    width: 900,
    height: 700,
    title: "Sermon Flow — Setup & Settings",
    backgroundColor: "#0b0f17",
    webPreferences: { preload: path.join(__dirname, "preload.js") }
  });

  settingsWin.loadFile(path.join(__dirname, "renderer", "settings.html"));
  settingsWin.on("closed", () => (settingsWin = null));
}

app.whenReady().then(() => {
  createOperatorAndProjector();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createOperatorAndProjector();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("will-quit", () => {
  unregisterAllShortcuts();
});

// Relay operator -> projector
ipcMain.on("projector:show", (_evt, payload) => {
  if (projectorWin) projectorWin.webContents.send("projector:show", payload);
});
ipcMain.on("projector:clear", () => {
  if (projectorWin) projectorWin.webContents.send("projector:clear");
});

// Open settings on demand
ipcMain.on("settings:open", () => openSettingsWindow());
