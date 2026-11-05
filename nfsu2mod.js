/**
 * NFSU2 Desktop Client Dynamic Mod & Telemetry Engine (nfsu2mod.js)
 * ------------------------------------------------------------------
 * Loaded dynamically on startup from GitHub (with local fallback).
 * Provides live telemetry extraction for Discord Rich Presence, client-side
 * enhancements, in-game quality-of-life tweaks, and seamless over-the-air updates
 * without requiring client re-compilations.
 */

(() => {
  if (window.__nfsu2modLoaded) {
    console.log('[nfsu2mod] Already active, version:', window.__nfsu2modVersion);
    return;
  }

  const MOD_VERSION = '1.0.0';
  window.__nfsu2modLoaded = true;
  window.__nfsu2modVersion = MOD_VERSION;

  console.log(`%c[NFSU2 Desktop Mod Engine v${MOD_VERSION}] Initializing...`, 'color: #c8f088; font-weight: bold;');

  let gameStartTime = null;
  let raceStartTime = null;
  let wasInRace = false;
  let lastActivityKey = '';
  const clientLaunchTime = Date.now();

  function formatNumber(num) {
    return Math.round(num || 0).toLocaleString('en-US');
  }

  function getTelemetry() {
    const isPlaying = Boolean(document.body && document.body.dataset.phase === 'playing');
    const statusEl = document.getElementById('status');
    const statusText = statusEl ? statusEl.textContent.trim() : '';

    const roamOnlineEl = document.getElementById('players-roam');
    const totalOnlineEl = document.getElementById('players-online');
    const onlineRoam = roamOnlineEl ? roamOnlineEl.textContent.trim() : '';
    const onlineTotal = totalOnlineEl ? totalOnlineEl.textContent.trim() : '';

    const lobbyEl = document.getElementById('lobby');
    const lobbyText = (lobbyEl && !lobbyEl.hidden) ? lobbyEl.textContent.trim() : '';

    let gameData = {
      saveName: '',
      fps: 0,
      statusMap: {},
      peersCount: 0
    };

    if (window.__nfsu2) {
      const nf = window.__nfsu2;
      const session = nf.session;
      gameData.saveName = typeof nf.save === 'string' ? nf.save : '';
      gameData.fps = nf.fps ? Math.round(nf.fps.game || 0) : 0;

      if (session && session.status && typeof session.status.read === 'function') {
        try {
          const map = session.status.read();
          if (map) {
            for (const [k, v] of map) {
              gameData.statusMap[k] = v;
            }
          }
        } catch (_) {}
      }

      if (session && session.net && Array.isArray(session.net.peers)) {
        gameData.peersCount = session.net.peers.length;
      }
    }

    return {
      isPlaying,
      statusText,
      onlineRoam,
      onlineTotal,
      lobbyText,
      gameData
    };
  }

  function computeDiscordActivity(info) {
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
          state = driftTotal > 0 ? `Score: ${formatNumber(driftTotal)} pts` : 'Drifting in Bayview';
        } else {
          details = '🏁 Racing Event';
          state = isMoving ? 'Full Throttle | Bayview' : 'At the Starting Grid';
        }
        startTimestamp = raceStartTime || gameStartTime || clientLaunchTime;
      } else if (isDriving && !isMenu) {
        if ((drift & 1) !== 0) {
          details = '💨 Street Drifting';
          state = driftTotal > 0 ? `Drift: ${formatNumber(driftTotal)} pts` : 'Sliding around Bayview';
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

    return {
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
  }

  function update() {
    try {
      const telemetry = getTelemetry();
      const activity = computeDiscordActivity(telemetry);

      const activityKey = `${activity.details}|${activity.state}|${activity.smallImageText}`;
      if (activityKey !== lastActivityKey) {
        lastActivityKey = activityKey;
        if (window.electronAPI && typeof window.electronAPI.updateDiscordActivity === 'function') {
          window.electronAPI.updateDiscordActivity(activity);
        }
      }
    } catch (err) {
      console.warn('[nfsu2mod] Update loop error:', err);
    }
  }

  // Poll telemetry every 4 seconds
  const intervalId = setInterval(update, 4000);
  update();

  window.__nfsu2mod = {
    version: MOD_VERSION,
    getTelemetry,
    forceUpdate: update,
    stop: () => clearInterval(intervalId)
  };

  console.log(`%c[NFSU2 Desktop Mod Engine v${MOD_VERSION}] Running.`, 'color: #c8f088;');
})();
