const { app, BrowserWindow, globalShortcut, screen, ipcMain } = require("electron");
const path = require("path");

let operatorWin = null;
let projectorWin = null;
let settingsWin = null;

function unregisterAllShortcuts() {
  try { globalShortcut.unregisterAll(); } catch {}
}

function registerShortcuts() {
  const register = (accel, action) => {
    globalShortcut.register(accel, () => {
      if (operatorWin) operatorWin.webContents.send("remote-action", action);
    });
  };

  // Safe clicker keys (won’t break typing)
  register("PageDown", "NEXT");
  register("PageUp", "PREV");
  register("Escape", "CLEAR");

  // Version switching
  register("F1", "SET_VER_KJV");
  register("F2", "SET_VER_NKJV");
  register("F3", "SET_VER_NLT");
  register("F4", "SET_VER_GNT");
}

function makeWindow(opts) {
  return new BrowserWindow({
    ...opts,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: true,   // ✅ fixes buttons + require()
      contextIsolation: true   // keep preload bridge working
    }
  });
}

function createOperatorAndProjector() {
  const displays = screen.getAllDisplays();
  const primary = screen.getPrimaryDisplay();
  const secondary = displays.find(d => d.id !== primary.id) || primary;

  operatorWin = makeWindow({
    width: 1200,
    height: 780,
    title: "Sermon Flow — Operator",
    backgroundColor: "#0b0f17"
  });

  projectorWin = makeWindow({
    x: secondary.bounds.x,
    y: secondary.bounds.y,
    width: secondary.bounds.width,
    height: secondary.bounds.height,
    title: "Sermon Flow — Projector",
    backgroundColor: "#000000",
    fullscreen: true,
    frame: false,
    alwaysOnTop: true
  });

  operatorWin.loadFile(path.join(__dirname, "renderer", "operator.html"));
  projectorWin.loadFile(path.join(__dirname, "renderer", "projector.html"));

  operatorWin.on("closed", () => (operatorWin = null));
  projectorWin.on("closed", () => (projectorWin = null));

  // Only capture remote keys when Sermon Flow is focused
  operatorWin.on("focus", () => {
    unregisterAllShortcuts();
    registerShortcuts();
  });

  operatorWin.on("blur", () => {
    unregisterAllShortcuts();
  });
}

function openSettingsWindow() {
  if (settingsWin) {
    settingsWin.focus();
    return;
  }

  settingsWin = makeWindow({
    width: 900,
    height: 700,
    title: "Sermon Flow — Setup & Settings",
    backgroundColor: "#0b0f17"
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
