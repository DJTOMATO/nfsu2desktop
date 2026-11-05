const { app, BrowserWindow, dialog, ipcMain, nativeImage, powerSaveBlocker, session, shell } = require('electron');
const path = require('path');

const TARGET_URL = 'https://nfsu2.xyz/';
const ALLOWED_HOST = 'nfsu2.xyz';

// Maximize GPU, WebGPU, WebAssembly, Audio, and Network hardware capabilities
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('force_high_performance_gpu');
app.commandLine.appendSwitch('enable-unsafe-webgpu');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('enable-oop-rasterization');
app.commandLine.appendSwitch('enable-accelerated-2d-canvas');
app.commandLine.appendSwitch('enable-quic');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('disk-cache-size', String(3 * 1024 * 1024 * 1024)); // 3 GB cache for ~1.8 GB preload game assets and streamed data

// Prevent background throttling so online multiplayer (Free Roam & Races) never desyncs or disconnects
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');

// Ensure WebAssembly JSPI, Exception Handling (try_table), Tail Calls, and SIMD are enabled
app.commandLine.appendSwitch('enable-experimental-web-platform-features');

if (process.platform === 'linux') {
  // Clear any global Electron environment hints (e.g. CachyOS / Arch /etc/environment or electron-flags.conf)
  // that force native Wayland Ozone, which causes Chromium's wayland_surface_factory to crash with Vulkan
  delete process.env.ELECTRON_OZONE_PLATFORM_HINT;

  // Unless the user explicitly passed --ozone-platform via CLI, force X11 (XWayland)
  // This allows hardware-accelerated Vulkan & WebGPU to run stably without Wayland surface conflicts
  if (!app.commandLine.hasSwitch('ozone-platform')) {
    app.commandLine.appendSwitch('ozone-platform', 'x11');
  }
  if (!app.commandLine.hasSwitch('ozone-platform-hint')) {
    app.commandLine.appendSwitch('ozone-platform-hint', 'x11');
  }

  // Only append Vulkan to enable-features if not forced into native Wayland
  const isExplicitWayland = app.commandLine.getSwitchValue('ozone-platform') === 'wayland';
  if (isExplicitWayland) {
    app.commandLine.appendSwitch('enable-features', 'WebAssemblyJSPI');
  } else {
    app.commandLine.appendSwitch('enable-features', 'Vulkan,WebAssemblyJSPI');
  }
} else {
  app.commandLine.appendSwitch('enable-features', 'WebAssemblyJSPI');
}

app.setName('Underground 2 Revived');
if (process.platform === 'win32') {
  app.setAppUserModelId('com.glas.nfsu2desktop');
}

let mainWindow = null;
let powerSaveId = null;
let isClosingApp = false;
let lastBackToSiteTimestamp = 0;

async function handleCloseOrExit(event) {
  if (isClosingApp || !mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  if (event) {
    event.preventDefault();
  }

  // If the user already triggered exit back to the website within the last 2.5s, close immediately
  if (Date.now() - lastBackToSiteTimestamp < 2500) {
    isClosingApp = true;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.destroy();
    }
    app.quit();
    return;
  }

  try {
    const isPlaying = await mainWindow.webContents.executeJavaScript(
      'Boolean(document.body && document.body.dataset.phase === "playing")'
    ).catch(() => false);

    if (isPlaying) {
      lastBackToSiteTimestamp = Date.now();

      // Release pointer lock and bypass beforeunload
      await mainWindow.webContents.executeJavaScript(`
        try {
          if (document.exitPointerLock) document.exitPointerLock();
          window.onbeforeunload = null;
        } catch (_) {}
      `).catch(() => {});

      // Send the player back to the website home screen
      mainWindow.loadURL(TARGET_URL);
      return;
    }
  } catch (_) {
    // If checking state fails, proceed to close
  }

  isClosingApp = true;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.destroy();
  }
  app.quit();
}

const GITHUB_REPO = 'DJTOMATO/nfsu2desktop';
const RELEASES_URL = `https://github.com/${GITHUB_REPO}/releases`;
const API_LATEST_RELEASE = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

function isNewerVersion(remote, local) {
  const cleanRemote = String(remote || '').replace(/^v/i, '').trim();
  const cleanLocal = String(local || '').replace(/^v/i, '').trim();
  const rParts = cleanRemote.split('.').map(n => parseInt(n, 10) || 0);
  const lParts = cleanLocal.split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(rParts.length, lParts.length); i++) {
    const r = rParts[i] || 0;
    const l = lParts[i] || 0;
    if (r > l) return true;
    if (r < l) return false;
  }
  return false;
}

async function checkForUpdates(parentWindow) {
  try {
    const response = await fetch(API_LATEST_RELEASE, {
      headers: {
        'User-Agent': `nfsu2desktop/${app.getVersion()}`
      }
    });
    if (!response.ok) return;
    const data = await response.json();
    const latestTag = data.tag_name || data.name || '';
    if (latestTag && isNewerVersion(latestTag, app.getVersion())) {
      const { response: buttonIndex } = await dialog.showMessageBox(parentWindow || null, {
        type: 'info',
        title: 'Update Available — Underground 2 Revived',
        message: `A new version of Underground 2 Revived (${latestTag}) is available!`,
        detail: `You are currently using v${app.getVersion()}.\n\nVisit GitHub to download the latest release installer.`,
        buttons: ['Download Latest Version', 'Later'],
        defaultId: 0,
        cancelId: 1,
        noLink: true
      });
      if (buttonIndex === 0) {
        shell.openExternal(data.html_url || RELEASES_URL);
      }
    }
  } catch (_) {
    // Fail silently if offline
  }
}

// --- Dynamic Mod Engine (nfsu2mod.js) ---
const REMOTE_MOD_URL = 'https://raw.githubusercontent.com/DJTOMATO/nfsu2desktop/main/nfsu2mod.js';
let cachedModCode = null;
let lastModRpcTimestamp = 0;

async function fetchRemoteModScript() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`${REMOTE_MOD_URL}?t=${Date.now()}`, {
      signal: controller.signal,
      headers: { 'User-Agent': `nfsu2desktop/${app.getVersion()}` }
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      cachedModCode = await res.text();
      return cachedModCode;
    }
  } catch (_) {}

  // Fallback to local bundled copy if offline or fetch failed
  if (!cachedModCode) {
    try {
      const fs = require('fs');
      const localModPath = path.join(__dirname, 'nfsu2mod.js');
      if (fs.existsSync(localModPath)) {
        cachedModCode = fs.readFileSync(localModPath, 'utf8');
      }
    } catch (_) {}
  }

  return cachedModCode;
}

async function injectModScript(targetWindow) {
  if (!targetWindow || targetWindow.isDestroyed()) return;
  try {
    const modCode = await fetchRemoteModScript();
    if (modCode && targetWindow && !targetWindow.isDestroyed()) {
      await targetWindow.webContents.executeJavaScript(modCode).catch(() => {});
    }
  } catch (_) {}
}

// --- Discord Rich Presence (RPC) ---
const RPC = require('discord-rpc');
const DISCORD_CLIENT_ID = '1044809640241799178';
let rpc = null;
let rpcConnected = false;
let rpcInterval = null;
let gameStartTime = null;
let raceStartTime = null;
let wasInRace = false;
const clientLaunchTime = Date.now();

function getRpcClient() {
  if (!rpc) {
    rpc = new RPC.Client({ transport: 'ipc' });

    rpc.on('ready', () => {
      rpcConnected = true;
      updateDiscordPresence();
    });

    rpc.on('disconnected', () => {
      rpcConnected = false;
    });
  }
  return rpc;
}

async function initDiscordRPC() {
  try {
    const client = getRpcClient();
    await client.login({ clientId: DISCORD_CLIENT_ID });
  } catch (_) {
    rpcConnected = false;
    // Retry periodically if Discord is opened later
    setTimeout(initDiscordRPC, 15000);
  }
}

async function updateDiscordPresence() {
  if (!rpcConnected || !rpc) return;

  // If nfsu2mod.js is actively sending live game activity updates, let it take precedence
  if (Date.now() - lastModRpcTimestamp < 15000) {
    return;
  }

  let info = null;
  if (mainWindow && !mainWindow.isDestroyed()) {
    try {
      info = await mainWindow.webContents.executeJavaScript(`
        (() => {
          const isPlaying = Boolean(document.body && document.body.dataset.phase === 'playing');
          const statusEl = document.getElementById('status');
          const statusText = statusEl ? statusEl.textContent.trim() : '';

          const roamOnlineEl = document.getElementById('players-roam');
          const totalOnlineEl = document.getElementById('players-online');
          const onlineRoam = roamOnlineEl ? roamOnlineEl.textContent.trim() : '';
          const onlineTotal = totalOnlineEl ? totalOnlineEl.textContent.trim() : '';

          const lobbyEl = document.getElementById('lobby');
          const lobbyText = (lobbyEl && !lobbyEl.hidden) ? lobbyEl.textContent.trim() : '';

          let gameData = null;
          if (window.__nfsu2) {
            const nf = window.__nfsu2;
            const session = nf.session;
            const saveName = typeof nf.save === 'string' ? nf.save : '';
            const fps = nf.fps ? Math.round(nf.fps.game || 0) : 0;

            let statusMap = {};
            if (session && session.status && typeof session.status.read === 'function') {
              try {
                const map = session.status.read();
                if (map) {
                  for (const [k, v] of map) {
                    statusMap[k] = v;
                  }
                }
              } catch (_) {}
            }

            let peersCount = 0;
            if (session && session.net && Array.isArray(session.net.peers)) {
              peersCount = session.net.peers.length;
            }

            gameData = {
              saveName,
              fps,
              statusMap,
              peersCount
            };
          }

          return {
            isPlaying,
            statusText,
            onlineRoam,
            onlineTotal,
            lobbyText,
            gameData
          };
        })()
      `).catch(() => null);
    } catch (_) {}
  }

  const isPlaying = Boolean(info && info.isPlaying);
  if (isPlaying && !gameStartTime) {
    gameStartTime = Date.now();
  } else if (!isPlaying) {
    gameStartTime = null;
    raceStartTime = null;
    wasInRace = false;
  }

  let details = 'Main Menu';
  let state = info?.onlineTotal ? `${info.onlineTotal} Players Online` : (info?.statusText || 'In Bayview Lobby');
  let startTimestamp = clientLaunchTime;
  let smallImageText = 'Underground 2 Revived';

  if (isPlaying) {
    const gd = info?.gameData || {};
    const sm = gd.statusMap || {};
    const drive = sm.drive ?? 0;
    const isDriving = (drive & 1) !== 0;
    const isMoving = (drive & 2) !== 0;
    const isMenu = (drive & 8) !== 0;
    const engage = sm.engage ?? 0;
    const netrace = sm.netrace ?? 0;
    const drift = sm.drift ?? 0;
    const driftTotal = sm.drift_total ?? 0;
    const hydraulics = sm.hydraulics ?? 0;
    const photo = sm.photo ?? 0;
    const pause = sm.pause ?? 0;
    const roamNear = sm.roam_near ?? 0;
    const peers = gd.peersCount ?? 0;
    const saveName = gd.saveName || '';
    const fps = gd.fps || 0;

    smallImageText = `${saveName ? 'Driver: ' + saveName : 'Need for Speed'}${fps > 0 ? ' (' + fps + ' FPS)' : ''}`;

    const isInRace = netrace > 0 || engage > 0;
    if (isInRace && !wasInRace) {
      raceStartTime = Date.now();
      wasInRace = true;
    } else if (!isInRace) {
      wasInRace = false;
      raceStartTime = null;
    }

    if (photo > 0) {
      details = '📸 In Photo Mode';
      state = 'Capturing Bayview City';
      startTimestamp = gameStartTime || clientLaunchTime;
    } else if (netrace > 0) {
      details = '🏁 Multiplayer Online Race';
      state = `${peers > 0 ? (peers + 1) + ' Racers | ' : ''}Bayview Circuit`;
      startTimestamp = raceStartTime || gameStartTime || clientLaunchTime;
    } else if (engage > 0) {
      if ((drift & 1) !== 0) {
        details = '🏎️ Drift Competition';
        state = driftTotal > 0 ? `Score: ${Math.round(driftTotal).toLocaleString()} pts` : 'Drifting in Bayview';
      } else {
        details = '🏁 Racing Event';
        state = isMoving ? 'Full Throttle | Bayview' : 'At the Starting Grid';
      }
      startTimestamp = raceStartTime || gameStartTime || clientLaunchTime;
    } else if (isDriving && !isMenu) {
      if ((drift & 1) !== 0) {
        details = '💨 Street Drifting';
        state = driftTotal > 0 ? `Drift: ${Math.round(driftTotal).toLocaleString()} pts` : 'Sliding around Bayview';
      } else if (hydraulics > 0) {
        details = '🎶 Lowrider Hydraulics';
        state = 'Bouncing Car | Bayview';
      } else {
        details = '🚗 Cruising Bayview (Free Roam)';
        if (roamNear > 0) {
          state = `Cruising with ${roamNear} nearby driver${roamNear > 1 ? 's' : ''}`;
        } else if (peers > 0) {
          state = `Exploring Bayview (${peers} online)`;
        } else {
          state = 'Exploring Bayview City';
        }
      }
      startTimestamp = gameStartTime || clientLaunchTime;
    } else {
      // In Garage / Tuning Shop / Menu / Pause
      if (pause > 0) {
        details = '⏸️ Paused';
        state = 'In-Game Menu';
      } else if (info?.lobbyText) {
        details = '🏁 In Race Lobby';
        state = info.lobbyText.slice(0, 120);
      } else {
        details = '🔧 In Garage / Custom Shop';
        state = 'Tuning & Styling Car';
      }
      startTimestamp = gameStartTime || clientLaunchTime;
    }
  }

  const activity = {
    details,
    state,
    startTimestamp,
    largeImageKey: 'logo',
    largeImageText: 'Underground 2 Revived',
    smallImageKey: 'logo',
    smallImageText,
    instance: false,
    buttons: [
      { label: 'Play in Browser', url: 'https://nfsu2.xyz/' },
      { label: 'Download Desktop App', url: 'https://github.com/DJTOMATO/nfsu2desktop/releases' }
    ]
  };

  try {
    await rpc.setActivity(activity);
  } catch (_) {
    rpcConnected = false;
  }
}

function getCleanUserAgent() {
  return app.userAgentFallback
    .replace(/\s*Electron\/[^\s]+/i, '')
    .replace(/\s*(?:underground-2-revived|nfsu2desktop)\/[^\s]+/i, '');
}

function getAppIcon() {
  const icoPath = path.join(__dirname, 'icon.ico');
  const pngPath = path.join(__dirname, 'icon.png');
  const icon = nativeImage.createFromPath(process.platform === 'win32' ? icoPath : pngPath);
  return icon.isEmpty() ? undefined : icon;
}

function createWindow() {
  const userAgent = getCleanUserAgent();

  // Grant hardware, storage & media permissions for nfsu2.xyz (Gamepad, WebGPU, Fullscreen, Audio, PointerLock, HID Wheels, File System for F9 Custom Radio)
  const allowedPermissions = new Set([
    'fullscreen',
    'pointerLock',
    'gamepad',
    'hid',
    'media',
    'audioCapture',
    'clipboard-read',
    'clipboard-sanitized-write',
    'idle-detection',
    'window-management',
    'fileSystem',
    'storage-access',
    'persistent-storage',
    'background-sync'
  ]);

  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    try {
      const url = new URL(webContents.getURL());
      if (url.hostname === ALLOWED_HOST || url.hostname.endsWith(`.${ALLOWED_HOST}`)) {
        callback(allowedPermissions.has(permission));
        return;
      }
    } catch (_) {
      // Ignore invalid URLs
    }
    callback(false);
  });

  session.defaultSession.setPermissionCheckHandler((webContents, permission, requestingOrigin) => {
    try {
      const url = new URL(requestingOrigin);
      if (url.hostname === ALLOWED_HOST || url.hostname.endsWith(`.${ALLOWED_HOST}`)) {
        return allowedPermissions.has(permission);
      }
    } catch (_) {
      // Ignore invalid URLs
    }
    return false;
  });

  // Handle restricted directories so selecting folders (e.g. Music, Documents, Downloads, root drive) works for F9 Custom Radio
  session.defaultSession.on('file-system-access-restricted', (event, details, callback) => {
    try {
      const origin = details.origin || details.requestingUrl || TARGET_URL;
      const url = new URL(origin);
      if (url.hostname === ALLOWED_HOST || url.hostname.endsWith(`.${ALLOWED_HOST}`)) {
        callback('allow');
        return;
      }
    } catch (_) {
      // Ignore invalid URLs
    }
    callback('deny');
  });

  mainWindow = new BrowserWindow({
    width: 1366,
    height: 860,
    minWidth: 800,
    minHeight: 600,
    title: `Need for Speed: Underground 2 — Underground 2 Revived v${app.getVersion()}`,
    backgroundColor: '#0d0d0d',
    autoHideMenuBar: true,
    fullscreenable: true,
    icon: getAppIcon(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webgl: true,
      backgroundThrottling: false,
      paintWhenInitiallyHidden: true,
      spellcheck: false
    }
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.webContents.setUserAgent(userAgent);

  // Retain client version in the title bar when the page title changes
  mainWindow.on('page-title-updated', (event, title) => {
    event.preventDefault();
    const versionTag = `v${app.getVersion()}`;
    if (!title.includes(versionTag)) {
      mainWindow.setTitle(`${title} — ${versionTag}`);
    } else {
      mainWindow.setTitle(title);
    }
  });

  // Check for updates shortly after boot
  mainWindow.webContents.once('did-finish-load', () => {
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        checkForUpdates(mainWindow);
      }
    }, 2000);
  });

  // Open external links (e.g., Discord, Ko-fi, GitHub, ModDB) in the default OS browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsed = new URL(url);
      if (parsed.hostname === ALLOWED_HOST || parsed.hostname.endsWith(`.${ALLOWED_HOST}`)) {
        return { action: 'allow' };
      }
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
        shell.openExternal(url);
      }
    } catch (_) {
      // Ignore malformed URLs
    }
    return { action: 'deny' };
  });

  // Prevent in-window navigation away from nfsu2.xyz to external sites
  mainWindow.webContents.on('will-navigate', (event, url) => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol === 'file:') {
        return;
      }
      if (parsed.hostname !== ALLOWED_HOST && !parsed.hostname.endsWith(`.${ALLOWED_HOST}`)) {
        event.preventDefault();
        if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
          shell.openExternal(url);
        }
      }
    } catch (_) {
      event.preventDefault();
    }
  });

  // Disarm beforeunload so navigation or exit is never blocked
  mainWindow.webContents.on('will-prevent-unload', (event) => {
    event.preventDefault();
  });

  // Window-scoped keyboard shortcuts (F12 is preserved for the game's in-game screenshot feature)
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;

    if (input.alt && (input.key === 'F4' || input.code === 'F4')) {
      event.preventDefault();
      handleCloseOrExit();
      return;
    }

    if (input.key === 'F5' || (input.control && !input.alt && input.key.toLowerCase() === 'r')) {
      event.preventDefault();
      mainWindow.reload();
    } else if (input.key === 'F11' || (input.alt && input.key === 'Enter')) {
      event.preventDefault();
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
    } else if (input.control && input.shift && input.key.toLowerCase() === 'i') {
      event.preventDefault();
      mainWindow.webContents.toggleDevTools();
    }
  });

  // Intercept window 'X' close button
  mainWindow.on('close', (event) => {
    if (!isClosingApp) {
      handleCloseOrExit(event);
    }
  });

  // Inject dynamic mod engine (nfsu2mod.js) when nfsu2.xyz loads
  mainWindow.webContents.on('dom-ready', () => {
    const currentUrl = mainWindow?.webContents?.getURL() || '';
    if (currentUrl.includes(ALLOWED_HOST)) {
      injectModScript(mainWindow);
    }
  });

  mainWindow.webContents.on('did-finish-load', () => {
    const currentUrl = mainWindow?.webContents?.getURL() || '';
    if (currentUrl.includes(ALLOWED_HOST)) {
      injectModScript(mainWindow);
    }
  });

  // Fallback to local splash/retry view if network fails
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (!isMainFrame || errorCode === -3) return; // Ignore aborted loads (-3)
    if (validatedURL && validatedURL.startsWith('https://')) {
      mainWindow.loadFile('index.html', { query: { error: '1' } });
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
  powerSaveId = powerSaveBlocker.start('prevent-display-sleep');
  createWindow();

  // Initialize Discord Rich Presence
  initDiscordRPC();
  rpcInterval = setInterval(updateDiscordPresence, 10000);
});

ipcMain.on('load-site', (event, url) => {
  if (!mainWindow) return;
  try {
    const parsed = new URL(url || TARGET_URL);
    if (parsed.hostname === ALLOWED_HOST || parsed.hostname.endsWith(`.${ALLOWED_HOST}`)) {
      mainWindow.loadURL(parsed.toString());
    } else {
      mainWindow.loadURL(TARGET_URL);
    }
  } catch (_) {
    mainWindow.loadURL(TARGET_URL);
  }
});

ipcMain.on('retry-connection', () => {
  if (mainWindow) {
    mainWindow.loadURL(TARGET_URL);
  }
});

ipcMain.on('discord-rpc-set-activity', async (event, activity) => {
  if (!rpcConnected || !rpc || !activity) return;
  lastModRpcTimestamp = Date.now();
  try {
    await rpc.setActivity(activity);
  } catch (_) {
    rpcConnected = false;
  }
});

app.on('before-quit', () => {
  if (rpcInterval) {
    clearInterval(rpcInterval);
    rpcInterval = null;
  }
  if (rpc) {
    try {
      rpc.clearActivity().catch(() => {});
      rpc.destroy().catch(() => {});
    } catch (_) {}
  }
});

app.on('window-all-closed', () => {
  if (powerSaveId !== null && powerSaveBlocker.isStarted(powerSaveId)) {
    powerSaveBlocker.stop(powerSaveId);
    powerSaveId = null;
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

