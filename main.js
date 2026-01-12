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

  // Safe clicker keys (won't break typing)
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
      // Keep preload for settings + api helper
      preload: path.join(__dirname, "preload.js"),

      // Make renderer scripts work reliably (buttons, require, etc.)
      nodeIntegration: true,
      contextIsolation: false
    }
  });
}

function createProjectorWindow() {
  const displays = screen.getAllDisplays();
  const primary = screen.getPrimaryDisplay();
  const secondary = displays.find(d => d.id !== primary.id);

  // If there is a real second display, fullscreen there (church mode).
  if (secondary) {
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
  } else {
    // If only one display, open windowed preview (test mode).
    projectorWin = makeWindow({
      width: 900,
      height: 520,
      title: "Sermon Flow — Projector (Preview)",
      backgroundColor: "#000000",
      fullscreen: false,
      frame: true,
      alwaysOnTop: false
    });
  }

  projectorWin.loadFile(path.join(__dirname, "renderer", "projector.html"));
  projectorWin.on("closed", () => (projectorWin = null));
}

function createOperatorWindow() {
  operatorWin = makeWindow({
    width: 1200,
    height: 780,
    title: "Sermon Flow — Operator",
    backgroundColor: "#0b0f17"
  });

  operatorWin.loadFile(path.join(__dirname, "renderer", "operator.html"));
  operatorWin.on("closed", () => (operatorWin = null));

  // Only capture remote keys when Operator window is focused
  operatorWin.on("focus", () => {
    unregisterAllShortcuts();
    registerShortcuts();
  });

  operatorWin.on("blur", () => {
    unregisterAllShortcuts();
  });
}

function createWindows() {
  createOperatorWindow();
  createProjectorWindow();
}

function openSettingsWindow() {
  if (settingsWin) { settingsWin.focus(); return; }

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
  createWindows();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindows();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("will-quit", () => {
  unregisterAllShortcuts();
});

// Relay operator -> projector (auto-recreate projector if it was closed)
ipcMain.on("projector:show", (_evt, payload) => {
  if (!projectorWin) createProjectorWindow();
  if (projectorWin) projectorWin.webContents.send("projector:show", payload);
});

ipcMain.on("projector:clear", () => {
  if (!projectorWin) createProjectorWindow();
  if (projectorWin) projectorWin.webContents.send("projector:clear");
});

ipcMain.on("settings:open", () => openSettingsWindow());
