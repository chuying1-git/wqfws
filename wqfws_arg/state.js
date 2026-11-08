// ============================================================
//  WQFWS ARG - Unified State Machine
//  15+ localStorage keys, cross-page persistence, time-gated triggers
// ============================================================

const STATE_KEY = 'wqfws-arg-state-v1';
const STATE_VERSION = 1;

// Default state schema - all keys initialized here
const DEFAULT_STATE = {
  // Meta
  version: STATE_VERSION,
  firstVisitTime: null,           // timestamp of first ever visit
  lastVisitTime: null,            // timestamp of last visit
  
  // Surface layer (fake wiki) interactions
  wikiSearchCount: 0,             // how many times search used
  wikiLastQuery: '',              // last search query
  hiddenEntryUnlocked: false,     // search "Ellis 蒋" or equivalent
  
  // Live/Appointment layer
  liveReserved: false,            // clicked "reserve" button
  liveReserveTime: null,          // when reserved
  livePopupShown: false,          // notification popup displayed
  liveNoticeMinimized: false,     // popup minimized to bubble
  liveRoomEntered: false,         // entered live_room.html
  liveRoomPhase: 0,               // video stream phase (0-3)
  liveKicked: false,              // kicked from live room (5s after chat)
  liveEarlyAccess: false,         // used passphrase to enter before scheduled start
  roomSolved: false,              // passed the two-step identity verification
  roomHiddenFrame: false,         // recovered hidden frame 0 (xinshijie)
  
  // Email system
  mailCreated: false,             // email account created (auto after kick)
  mailUsername: '',               // generated username
  mailPassword: '',               // generated password
  mailLoggedInAccount: '',        // currently logged in account
  zhouAccountUnlocked: false,     // logged into zhouyanan@mail.com
  mailViaKick: false,             // account was issued by the kick procedure
  mailRead: [],                   // ids of opened mails
  mailLoginFails: 0,              // failed login attempts
  mailSentCount: 0,               // mails sent
  archiveNoticeRead: false,       // read the "session archived" notice
  
  // Terminal/Pipeline
  terminalAccessed: false,        // visited terminal.html
  pipelineUnlocked: false,        // granted by replying to join@newworld.com
  pipelineSolved: false,          // correct pipeline submitted
  pipelineAttempts: 0,            // failed attempts
  pipelineSolvedAt: null,         // timestamp of solve
  grepRedacted: false,            // grep pattern redacted after first error
  ttrap: 0,                       // trap hits in pipeline
  hintsUsed: 0,                   // hint button uses
  
  // Archive/Hidden database
  archiveUnlocked: false,         // accessed archive.html
  archiveSearches: 0,             // archive search count
  finalCodeEntered: false,        // entered final code
  finalFails: 0,                  // failed final-code attempts
  
  // Global flags
  awakened: false,                // logo clicked 7 times / "new world" awakened
  endingReached: false,           // reached true ending
  endingReachedAt: null,          // when the ending was reached

  // newworld.html dual layer
  neworldRevealed: false,         // entered the hidden layer passphrase
  neworldFails: 0,                // failed passphrase attempts

  // ---- cipher chain (deep layer) ----
  freqDecoded: false,             // decoded raw binary sampling -> 875
  beaconDecoded: false,           // applied ROT13 to NYZBAQ -> ALMOND
  idDecoded: false,               // derived 7364-AL from 73/64 + rule
  cipherBookUnlocked: false,      // found the Vigenere book
  cipherRowFound: false,          // identified the corrupted table row
  vigenere4th: false,             // decoded the 4th final field (HANYU)
  badEndings: 0,                  // how many times the bad ending fired

  // ---- annex 03 stego chain (deepest secret) ----
  //   L1 文件尾指针 → L2 PNG tEXt → L4 音频频谱（给出偏移 875）
  //   → L3 蓝色通道 LSB（前半段）→ L5 两帧图差分（后半段）
  smilerL1: false,                // decoded the trailer pointer
  smilerL2: false,                // read the PNG tEXt metadata
  smilerL4: false,                // read 875 out of the audio spectrogram
  smilerL3: false,                // pulled the payload out of the blue-channel LSBs
  smilerL5: false,                // recovered the second half from the frame diff
  smilerSolved: false,            // all five layers recovered
  smilerSecret: '',               // what was hidden in the pixels

  // ---- hidden page / folklore layer ----
  gatekeeperFound: false,         // solved the LEVEL A passphrase
  gatekeeperFails: 0,             // wrong passphrase attempts
  nightShiftSeen: false,          // visited LEVEL A during 20:00–04:00
};

// In-memory state cache
let _stateCache = null;
let _dirty = false;

// Load state from localStorage, merge with defaults (backward compat)
export function loadState() {
  if (_stateCache !== null) return _stateCache;
  
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Merge with defaults for backward compatibility
      _stateCache = { ...DEFAULT_STATE, ...parsed };
    } else {
      _stateCache = { ...DEFAULT_STATE };
      // Set first visit time on brand new state
      _stateCache.firstVisitTime = Date.now();
      saveState();
    }
  } catch (e) {
    console.warn('State load failed, using defaults:', e);
    _stateCache = { ...DEFAULT_STATE };
    _stateCache.firstVisitTime = Date.now();
  }
  
  // Always update last visit time
  _stateCache.lastVisitTime = Date.now();
  _dirty = true;
  saveState();
  
  return _stateCache;
}

// Save state to localStorage (debounced)
export function saveState() {
  if (!_dirty || !_stateCache) return;
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(_stateCache));
    _dirty = false;
  } catch (e) {
    console.error('State save failed:', e);
  }
}

// Force immediate save
export function flushState() {
  _dirty = true;
  saveState();
}

// Get a value
export function get(key) {
  loadState();
  return _stateCache[key];
}

// Set a value
export function set(key, value) {
  loadState();
  if (_stateCache[key] !== value) {
    _stateCache[key] = value;
    _dirty = true;
    saveState();
  }
}

// Set multiple values at once
export function setMany(obj) {
  loadState();
  let changed = false;
  for (const [k, v] of Object.entries(obj)) {
    if (_stateCache[k] !== v) {
      _stateCache[k] = v;
      changed = true;
    }
  }
  if (changed) {
    _dirty = true;
    saveState();
  }
}

// Check if a key exists and is truthy
export function has(key) {
  loadState();
  return !!_stateCache[key];
}

// Reset entire state (for testing / new game)
export function resetState() {
  _stateCache = { ...DEFAULT_STATE };
  _stateCache.firstVisitTime = Date.now();
  _dirty = true;
  saveState();
  return _stateCache;
}

// Time-gated helpers
export function getTimeSinceFirstVisit() {
  loadState();
  return Date.now() - (_stateCache.firstVisitTime || Date.now());
}

export function getTimeSinceLiveReserve() {
  loadState();
  if (!_stateCache.liveReserveTime) return Infinity;
  return Date.now() - _stateCache.liveReserveTime;
}

// Check if live notification should trigger (20 min after first visit, only if reserved)
export function shouldShowLiveNotification() {
  loadState();
  if (!_stateCache.liveReserved) return false;
  if (_stateCache.livePopupShown) return false;
  // Trigger 20 minutes (1200000ms) after first visit
  return getTimeSinceFirstVisit() >= 1200000;
}

// Get the scheduled live time (first visit + 20 min)
export function getScheduledLiveTime() {
  loadState();
  return (_stateCache.firstVisitTime || Date.now()) + 1200000;
}

// Generate a deterministic but unique email username/password
export function generateEmailCredentials() {
  const adjectives = ['silent', 'hollow', 'rusted', 'flickering', 'buried', 'forgotten', 'sealed'];
  const nouns = ['observer', 'walker', 'listener', 'archivist', 'survivor', 'witness', 'drifter'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 9000) + 1000;
  const username = `${adj}_${noun}_${num}@wqfws.local`;
  const password = `wqfws_${Math.random().toString(36).slice(2, 10)}`;
  return { username, password };
}

// Export for debugging
export function getFullState() {
  loadState();
  return { ..._stateCache };
}

// Initialize on import
loadState();