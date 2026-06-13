// Native Tauri IPC API
window.api = {
  saveFile: (content, filePath, password) => window.__TAURI__.core.invoke('save_file', { content, filePath, password }),
  openFileDialog: () => window.__TAURI__.core.invoke('open_file_dialog'),
  saveFileDialog: () => window.__TAURI__.core.invoke('save_file_dialog'),
  readAndDecryptFile: (path, password) => window.__TAURI__.core.invoke('read_and_decrypt_file', { path, password }),
  getLaunchFilePath: () => window.__TAURI__.core.invoke('get_launch_file_path'),
  toggleFullscreen: () => window.__TAURI__.core.invoke('toggle_fullscreen'),
  quitApp: () => window.__TAURI__.core.invoke('quit_app'),
  showUnsavedPrompt: () => window.__TAURI__.core.invoke('show_unsaved_prompt'),
  showErrorDialog: (message) => window.__TAURI__.core.invoke('show_error_dialog', { message }),
  onNativeCloseRequest: (callback) => {
    const tauriWindow = window.__TAURI__?.window;
    if (tauriWindow?.getCurrentWindow) {
      const currentWindow = tauriWindow.getCurrentWindow();
      if (currentWindow?.onCloseRequested) {
        return currentWindow.onCloseRequested(callback);
      }
    }

    if (window.__TAURI__?.event) {
      return window.__TAURI__.event.listen('tauri://close-requested', callback);
    }

    return null;
  }
};

// Web Audio API Typewriter Synthesizer
class TypewriterSynth {
  constructor() {
    this.audioCtx = null;
    this.volume = 0.5;
    this.preset = 'mechanical';
  }

  init() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  setPreset(preset) {
    this.preset = preset;
  }

  scheduleDisconnect(node, delayMs) {
    setTimeout(() => {
      try {
        node.disconnect();
      } catch (_) {
        // The node may already be disconnected by the browser audio engine.
      }
    }, delayMs);
  }

  playClick(isEnter = false, isSpace = false) {
    if (this.preset === 'off' || this.volume === 0) return;
    this.init();

    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    if (isEnter) {
      this.triggerKeyClick(isSpace);
      // Play retro typewriter return bell slightly after enter key impact
      setTimeout(() => {
        this.triggerBell();
      }, 120);
    } else {
      this.triggerKeyClick(isSpace);
    }
  }

  triggerKeyClick(isSpace) {
    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(this.volume * (isSpace ? 0.7 : 1.0), now);
    masterGain.connect(ctx.destination);

    if (this.preset === 'mechanical' || this.preset === 'heavy-buckling') {
      const isHeavy = this.preset === 'heavy-buckling';

      // 1. Sharp Click Transient (filtered noise burst)
      const bufferSize = ctx.sampleRate * 0.025; // 25ms
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noiseNode = ctx.createBufferSource();
      noiseNode.buffer = buffer;

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'highpass';
      noiseFilter.frequency.setValueAtTime(isHeavy ? 1200 : 2200, now);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(isHeavy ? 0.9 : 0.6, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + (isHeavy ? 0.02 : 0.012));

      noiseNode.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(masterGain);

      // 2. Spring Ring & Key Bottoming Resonance
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'sine';

      const baseFreq = isHeavy ? 190 : 310;
      osc.frequency.setValueAtTime(baseFreq * 2.2, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq, now + 0.025);

      oscGain.gain.setValueAtTime(isSpace ? 0.15 : 0.28, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + (isHeavy ? 0.075 : 0.045));

      osc.connect(oscGain);
      oscGain.connect(masterGain);

      // 3. High-Pitch Spring Ping (Only for buckle springs)
      const ringOsc = ctx.createOscillator();
      const ringGain = ctx.createGain();
      ringOsc.type = 'sine';
      ringOsc.frequency.setValueAtTime(isHeavy ? 1400 : 1650, now);

      ringGain.gain.setValueAtTime(isHeavy ? 0.06 : 0.015, now);
      ringGain.gain.exponentialRampToValueAtTime(0.001, now + (isHeavy ? 0.05 : 0.03));

      ringOsc.connect(ringGain);
      ringGain.connect(masterGain);

      // Start & Stop triggers
      noiseNode.start(now);
      osc.start(now);
      ringOsc.start(now);

      noiseNode.stop(now + 0.1);
      osc.stop(now + 0.1);
      ringOsc.stop(now + 0.1);

    } else if (this.preset === 'retro-synth') {
      // 80s Cyberpunk Terminal Beep Click
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(isSpace ? 480 : 720, now);

      oscGain.gain.setValueAtTime(0.12, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.012);

      osc.connect(oscGain);
      oscGain.connect(masterGain);

      osc.start(now);
      osc.stop(now + 0.04);
    }

    this.scheduleDisconnect(masterGain, 160);
  }

  triggerBell() {
    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(this.volume * 0.45, now);
    masterGain.connect(ctx.destination);

    // FM Synthesis for metallic bell chime
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const osc3 = ctx.createOscillator();

    const gain1 = ctx.createGain();
    const gain2 = ctx.createGain();
    const gain3 = ctx.createGain();

    osc1.frequency.setValueAtTime(2100, now);
    osc2.frequency.setValueAtTime(2650, now);
    osc3.frequency.setValueAtTime(3200, now);

    gain1.gain.setValueAtTime(0.35, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);

    gain2.gain.setValueAtTime(0.18, now);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);

    gain3.gain.setValueAtTime(0.1, now);
    gain3.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

    osc1.connect(gain1);
    gain1.connect(masterGain);

    osc2.connect(gain2);
    gain2.connect(masterGain);

    osc3.connect(gain3);
    gain3.connect(masterGain);

    osc1.start(now);
    osc2.start(now);
    osc3.start(now);

    osc1.stop(now + 0.8);
    osc2.stop(now + 0.8);
    osc3.stop(now + 0.8);

    this.scheduleDisconnect(masterGain, 900);
  }
}

// Instantiate Typewriter Synth
const typewriter = new TypewriterSynth();

// Application State Variables
let currentFilePath = null;
let currentPassword = '';
let isDirty = false;
let isUnconfirmedDraft = false;
let autoSaveIntervalId = null;

// DOM Elements Reference
const editor = document.getElementById('editor');
const editorContainer = document.getElementById('editor-container');
const topMenu = document.getElementById('top-menu');
const bottomStatus = document.getElementById('bottom-status');
const fileNameDisplay = document.getElementById('file-name');
const saveStatusBadge = document.getElementById('save-status');

// Stat Display Elements
const statWords = document.getElementById('stat-words');
const statChars = document.getElementById('stat-chars');
const statReadTime = document.getElementById('stat-read-time');

// Settings Elements
const settingsModal = document.getElementById('settings-modal');
const fontSlider = document.getElementById('setting-font-size');
const fontVal = document.getElementById('font-size-val');
const lineSelect = document.getElementById('setting-line-height');
const widthSlider = document.getElementById('setting-layout-width');
const widthVal = document.getElementById('layout-width-val');
const themeSelect = document.getElementById('setting-color-theme');
const glowSlider = document.getElementById('setting-glow-blur');
const glowVal = document.getElementById('glow-blur-val');
const crtCheckbox = document.getElementById('setting-crt-effects');
const volSlider = document.getElementById('setting-volume');
const volVal = document.getElementById('volume-val');
const soundSelect = document.getElementById('setting-sound-preset');
const autosaveSelect = document.getElementById('setting-autosave');

// Button Elements
const btnNew = document.getElementById('btn-new');
const btnOpen = document.getElementById('btn-open');
const btnSave = document.getElementById('btn-save');
const btnSaveAs = document.getElementById('btn-save-as');
const btnSettings = document.getElementById('btn-settings');
const btnFullscreen = document.getElementById('btn-fullscreen');
const btnQuit = document.getElementById('btn-quit');
const btnCloseSettings = document.getElementById('btn-close-settings');

// Password Modal Elements
const passwordModal = document.getElementById('password-modal');
const passwordInput = document.getElementById('password-input');
const btnPasswordSubmit = document.getElementById('btn-password-submit');
const btnPasswordCancel = document.getElementById('btn-password-cancel');
const passwordModalTitle = document.getElementById('password-modal-title');
const passwordModalDesc = document.getElementById('password-modal-desc');
const searchPrompt = document.getElementById('search-prompt');
const searchInput = document.getElementById('search-input');
const searchCount = document.getElementById('search-count');

let passwordResolve = null;
let searchState = {
  query: '',
  matches: [],
  index: -1
};

function updateTopMenuClearance() {
  const menuHeight = Math.ceil(topMenu.getBoundingClientRect().height);
  const editorPaddingTop = parseFloat(getComputedStyle(editor).paddingTop) || 0;
  const textGap = 12;
  const clearance = Math.max(0, menuHeight + textGap - editorPaddingTop);
  document.body.style.setProperty('--top-menu-clearance', `${clearance}px`);
}

function promptPassword(isSave) {
  return new Promise((resolve) => {
    passwordModalTitle.textContent = isSave ? 'SET ENCRYPTION KEY' : 'ENTER ENCRYPTION KEY';
    passwordModalDesc.textContent = isSave ? 'Set a password to encrypt this file.' : 'Enter the password to decrypt this file.';
    passwordInput.value = '';
    passwordModal.classList.remove('hidden');
    passwordInput.focus();

    passwordResolve = resolve;
  });
}

btnPasswordSubmit.addEventListener('click', () => {
  if (passwordResolve) {
    passwordResolve(passwordInput.value);
    passwordResolve = null;
  }
  passwordModal.classList.add('hidden');
  editor.focus();
});

btnPasswordCancel.addEventListener('click', () => {
  if (passwordResolve) {
    passwordResolve(null);
    passwordResolve = null;
  }
  passwordModal.classList.add('hidden');
  editor.focus();
});

passwordInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    e.stopPropagation();
    btnPasswordSubmit.click();
  } else if (e.key === 'Escape') {
    e.preventDefault();
    e.stopPropagation();
    btnPasswordCancel.click();
  }
});

passwordModal.addEventListener('click', (e) => {
  if (e.target === passwordModal) {
    btnPasswordCancel.click();
  }
});

/* =========================================================================
   1. Document Conversion (HTML <-> Markdown)
   ========================================================================= */

/**
 * Transforms visual HTML contents of editor into raw Markdown format.
 */
function getEditorMarkdown() {
  const nodes = Array.from(editor.childNodes);
  const markdownLines = [];

  if (nodes.length === 0) return '';

  nodes.forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      markdownLines.push(node.textContent);
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const tag = node.tagName.toLowerCase();
      const text = node.textContent;

      if (tag === 'h1') {
        markdownLines.push(`# ${text}`);
      } else if (tag === 'h2') {
        markdownLines.push(`## ${text}`);
      } else if (tag === 'hr') {
        markdownLines.push('---');
      } else if (tag === 'br') {
        markdownLines.push('');
      } else if (tag === 'div' || tag === 'p') {
        if (node.innerHTML === '<br>' || node.textContent === '') {
          markdownLines.push('');
        } else {
          markdownLines.push(text);
        }
      } else {
        markdownLines.push(text);
      }
    }
  });

  return markdownLines.join('\n');
}

/**
 * Translates standard Markdown plain text back into editor visual HTML.
 */
function loadMarkdownToEditor(markdown) {
  editor.innerHTML = '';
  
  if (!markdown) {
    // If empty, populate basic editable environment
    const div = document.createElement('div');
    div.innerHTML = '<br>';
    editor.appendChild(div);
    editor.focus();
    return;
  }

  const lines = markdown.split('\n');
  lines.forEach(line => {
    if (line.startsWith('# ')) {
      const h1 = document.createElement('h1');
      h1.textContent = line.substring(2);
      editor.appendChild(h1);
    } else if (line.startsWith('## ')) {
      const h2 = document.createElement('h2');
      h2.textContent = line.substring(3);
      editor.appendChild(h2);
    } else if (line.trim() === '---') {
      editor.appendChild(document.createElement('hr'));
    } else if (line.trim() === '') {
      const div = document.createElement('div');
      div.innerHTML = '<br>';
      editor.appendChild(div);
    } else {
      const div = document.createElement('div');
      div.textContent = line;
      editor.appendChild(div);
    }
  });

  const lastChild = editor.lastElementChild;
  if (lastChild && lastChild.tagName.toLowerCase() === 'hr') {
    editor.appendChild(createEmptyLine());
  }
}

/* =========================================================================
   2. Text Statistics & Formatting Logic
   ========================================================================= */

let updateStatsTimeout;
let draftBackupTimeout;

function updateStats() {
  clearTimeout(updateStatsTimeout);
  updateStatsTimeout = setTimeout(() => {
    const text = editor.textContent || '';
    const charCount = text.length;
    
    // Calculate words: split by whitespace but exclude empty entries
    const wordsArray = text.trim().split(/\s+/).filter(w => w.length > 0);
    const wordCount = wordsArray.length;

    // Reading time (assume average speed of 200 words per minute)
    const readTime = Math.ceil(wordCount / 200);

    statWords.textContent = `${wordCount} word${wordCount === 1 ? '' : 's'}`;
    statChars.textContent = `${charCount} char${charCount === 1 ? '' : 's'}`;
    statReadTime.textContent = `${readTime} min read`;
  }, 300);
}

function markDirty(dirty) {
  isDirty = dirty;
  if (dirty) {
    saveStatusBadge.textContent = 'UNSAVED CHANGES';
    saveStatusBadge.classList.add('active');
    
    clearTimeout(draftBackupTimeout);
    draftBackupTimeout = setTimeout(() => {
      try {
        localStorage.setItem('mt_draft_content', getEditorMarkdown());
        localStorage.setItem('mt_draft_path', currentFilePath || '');
      } catch (e) {
        console.warn('Draft backup failed (possibly exceeded localStorage quota)', e);
      }
    }, 1000);
  } else {
    saveStatusBadge.classList.remove('active');
    clearTimeout(draftBackupTimeout);
    // Clear keystroke draft cache on explicit save
    localStorage.removeItem('mt_draft_content');
    localStorage.removeItem('mt_draft_path');
  }
}

/**
 * Checks selection line content to auto-format "#" and "##" on space
 */
function handleMarkdownShortcut(e) {
  if (e.key !== ' ') return;
  
  const block = getActiveBlock();
  if (!block || block.nodeType !== Node.ELEMENT_NODE) return;

  const tag = block.tagName.toLowerCase();
  if (tag !== 'div' && tag !== 'p') return;

  const text = block.textContent;
  if (text === '#') {
    e.preventDefault();
    const h1 = document.createElement('h1');
    h1.innerHTML = '<br>';
    editor.replaceChild(h1, block);
    setCursorToEnd(h1);
    markDirty(true);
  } else if (text === '##') {
    e.preventDefault();
    const h2 = document.createElement('h2');
    h2.innerHTML = '<br>';
    editor.replaceChild(h2, block);
    setCursorToEnd(h2);
    markDirty(true);
  } else if (text === '---') {
    e.preventDefault();
    replaceBlockWithDivider(block);
  }
}

function getActiveBlock() {
  const selection = window.getSelection();
  if (selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    let node = range.startContainer;
    while (node && node !== editor) {
      if (node.parentNode === editor) {
        return node;
      }
      node = node.parentNode;
    }
  }
  return null;
}

function setCursorToEnd(el) {
  el.focus();
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

function createEmptyLine() {
  const div = document.createElement('div');
  div.innerHTML = '<br>';
  return div;
}

function replaceBlockWithDivider(block) {
  const divider = document.createElement('hr');
  const nextLine = createEmptyLine();

  editor.replaceChild(divider, block);

  if (divider.nextSibling) {
    editor.insertBefore(nextLine, divider.nextSibling);
  } else {
    editor.appendChild(nextLine);
  }

  setCursorToEnd(nextLine);
  markDirty(true);
}

function stripHtmlToPlainText(html) {
  const doc = new DOMParser().parseFromString(html || '', 'text/html');
  doc.querySelectorAll('script, style, noscript').forEach((node) => node.remove());
  return doc.body.innerText || doc.body.textContent || '';
}

function getPlainTextFromPaste(e) {
  const clipboard = e.clipboardData || window.clipboardData;
  if (!clipboard) return '';

  const plainText = clipboard.getData('text/plain');
  if (plainText) return plainText;

  return stripHtmlToPlainText(clipboard.getData('text/html'));
}

function insertPlainTextAtCursor(text) {
  const normalizedText = text.replace(/\r\n?/g, '\n');
  if (!normalizedText) return;

  const inserted = document.execCommand('insertText', false, normalizedText);
  if (!inserted) {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    range.deleteContents();
    range.insertNode(document.createTextNode(normalizedText));
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  updateStats();
  markDirty(true);
}

function handlePlainTextPaste(e) {
  e.preventDefault();

  const text = getPlainTextFromPaste(e);
  if (!text) return;

  insertPlainTextAtCursor(text);
}

function toggleBlockType(targetTag) {
  const block = getActiveBlock();
  if (!block) return;

  const currentTag = block.tagName.toLowerCase();
  let text = block.textContent;
  const newTag = (currentTag === targetTag) ? 'div' : targetTag;

  const newBlock = document.createElement(newTag);
  if (newTag === 'div' && (text.startsWith('# ') || text.startsWith('## '))) {
    text = text.replace(/^#{1,2}\s+/, '');
  }

  newBlock.textContent = text || '';
  if (!text) {
    newBlock.innerHTML = '<br>';
  }

  editor.replaceChild(newBlock, block);
  setCursorToEnd(newBlock);
  markDirty(true);
}

function isSearchOpen() {
  return searchPrompt && !searchPrompt.classList.contains('hidden');
}

function updateSearchCount() {
  const total = searchState.matches.length;
  searchCount.textContent = total ? `${searchState.index + 1}/${total}` : '0/0';
}

function getSelectedEditorText() {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || !editor.contains(selection.anchorNode)) return '';
  return selection.toString().replace(/\s+/g, ' ').trim();
}

function collectEditorTextNodes() {
  const nodes = [];
  const walker = document.createTreeWalker(
    editor,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        if (!node.nodeValue || node.nodeValue.trim() === '') {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  let node = walker.nextNode();
  while (node) {
    nodes.push(node);
    node = walker.nextNode();
  }

  return nodes;
}

function refreshSearchMatches(query) {
  const normalizedQuery = query.trim().toLowerCase();
  searchState.query = query;
  searchState.matches = [];
  searchState.index = -1;

  if (!normalizedQuery) {
    updateSearchCount();
    return;
  }

  collectEditorTextNodes().forEach((node) => {
    const haystack = node.nodeValue.toLowerCase();
    let start = haystack.indexOf(normalizedQuery);

    while (start !== -1) {
      searchState.matches.push({
        node,
        start,
        end: start + normalizedQuery.length
      });
      start = haystack.indexOf(normalizedQuery, start + normalizedQuery.length);
    }
  });

  updateSearchCount();
}

function selectSearchMatch(index) {
  if (!searchState.query.trim()) {
    openSearchPrompt();
    return false;
  }

  refreshSearchMatches(searchState.query);
  if (!searchState.matches.length) {
    updateSearchCount();
    return false;
  }

  const total = searchState.matches.length;
  searchState.index = ((index % total) + total) % total;
  const match = searchState.matches[searchState.index];
  const range = document.createRange();
  range.setStart(match.node, match.start);
  range.setEnd(match.node, match.end);

  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);

  const block = getActiveBlock();
  if (block) {
    block.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  editor.focus();
  updateSearchCount();
  return true;
}

function jumpSearchResult(direction = 1) {
  if (!searchState.query.trim()) {
    openSearchPrompt();
    return;
  }

  const nextIndex = searchState.index === -1
    ? (direction > 0 ? 0 : searchState.matches.length - 1)
    : searchState.index + direction;

  const found = selectSearchMatch(nextIndex);
  if (!found) {
    showStatusMessage('NO MATCHES', 1400);
    searchInput.focus();
    searchInput.select();
  }
}

function openSearchPrompt() {
  const selectedText = getSelectedEditorText();
  if (selectedText) {
    searchState.query = selectedText;
  }

  searchInput.value = searchState.query;
  refreshSearchMatches(searchInput.value);
  searchPrompt.classList.remove('hidden');
  searchInput.focus();
  searchInput.select();
}

function closeSearchPrompt() {
  searchPrompt.classList.add('hidden');
  editor.focus();
}

function getHeaderBlocks() {
  return Array.from(editor.children).filter((child) => {
    const tag = child.tagName.toLowerCase();
    return tag === 'h1' || tag === 'h2';
  });
}

function jumpHeader(direction = 1) {
  const headers = getHeaderBlocks();
  if (!headers.length) {
    showStatusMessage('NO HEADERS', 1400);
    return;
  }

  const blocks = Array.from(editor.children);
  const activeBlock = getActiveBlock();
  const activeIndex = blocks.indexOf(activeBlock);
  let target = null;

  if (direction > 0) {
    target = headers.find((header) => blocks.indexOf(header) > activeIndex) || headers[0];
  } else {
    target = [...headers].reverse().find((header) => blocks.indexOf(header) < activeIndex) || headers[headers.length - 1];
  }

  target.scrollIntoView({ block: 'center', behavior: 'smooth' });
  setCursorToEnd(target);
}

/* =========================================================================
   3. Document Lifecycle (New, Open, Save)
   ========================================================================= */

function showStatusMessage(msg, duration = 3000) {
  saveStatusBadge.textContent = msg;
  saveStatusBadge.classList.add('active');
  
  // Flash class triggers top/bottom hover menu slide-downs to notify the user
  topMenu.classList.add('menu-active');
  bottomStatus.classList.add('menu-active');

  setTimeout(() => {
    topMenu.classList.remove('menu-active');
    bottomStatus.classList.remove('menu-active');
    
    // Restore badge depending on dirty state
    if (isDirty) {
      saveStatusBadge.textContent = 'UNSAVED CHANGES';
    } else {
      saveStatusBadge.classList.remove('active');
    }
  }, duration);
}

function isPlainTextPath(filePath) {
  return Boolean(filePath && filePath.toLowerCase().endsWith('.txt'));
}

function needsEncryptionPassword(filePath) {
  return Boolean(filePath && !isPlainTextPath(filePath));
}

function getSavedStatusMessage(filePath, isAutoSave = false) {
  if (isPlainTextPath(filePath)) {
    return isAutoSave ? 'AUTO-SAVED TEXT' : 'TEXT FILE SAVED';
  }

  return isAutoSave ? 'AUTO-SAVED ENCRYPTED' : 'FILE ENCRYPTED & SAVED';
}

async function promptUnsavedChanges() {
  if (!isDirty) return true; // Proceed if clean

  const response = await window.api.showUnsavedPrompt();
  
  if (response === 2) {
    return false; // Cancel operation
  }

  if (response === 0) {
    const saved = await handleSave();
    if (!saved) return false; // Abort if they cancelled the Save As dialog or it failed
  }

  return true; // Proceed with operation
}

async function handleNew() {
  const proceed = await promptUnsavedChanges();
  if (!proceed) return;

  currentFilePath = null;
  currentPassword = '';
  loadMarkdownToEditor('');
  fileNameDisplay.textContent = 'Untitled Document';
  markDirty(false);
  updateStats();
  showStatusMessage('NEW DOCUMENT CREATED');
}

async function handleOpen() {
  const proceed = await promptUnsavedChanges();
  if (!proceed) return;

  try {
    const resultPath = await window.api.openFileDialog();
    if (!resultPath) return; // Cancelled

    await loadFileFromPath(resultPath);
  } catch (error) {
    console.error('File open failed:', error);
  }
}

async function loadFileFromPath(resultPath, statusMessage = 'DOCUMENT LOADED') {
  try {
    let password = '';
    if (needsEncryptionPassword(resultPath)) {
      password = await promptPassword(false);
      if (password === null) return false; // Cancelled password
    }

    const result = await window.api.readAndDecryptFile(resultPath, password);

    if (result.success) {
      currentFilePath = result.filePath;
      currentPassword = password;
      loadMarkdownToEditor(result.content);
      
      const fileName = currentFilePath.split(/[\\/]/).pop();
      fileNameDisplay.textContent = fileName;
      markDirty(false);
      updateStats();
      showStatusMessage(statusMessage);
      return true;
    } else {
      await window.api.showErrorDialog(`Error loading file: ${result.error}`);
      return false;
    }
  } catch (error) {
    console.error('File open failed:', error);
    return false;
  }
}

async function loadLaunchFileIfAny() {
  try {
    if (!window.api?.getLaunchFilePath) return false;

    const launchPath = await window.api.getLaunchFilePath();
    if (!launchPath) return false;

    return await loadFileFromPath(launchPath, 'DOCUMENT LOADED FROM WINDOWS');
  } catch (error) {
    console.error('Launch file load failed:', error);
    return false;
  }
}

async function handleSave() {
  const content = getEditorMarkdown();
  
  // If we don't have a path yet, defer to Save As
  if (!currentFilePath) {
    return await handleSaveAs();
  }

  const savingPlainText = isPlainTextPath(currentFilePath);
  let password = savingPlainText ? '' : currentPassword;
  if (!savingPlainText && !password) {
    password = await promptPassword(true);
    if (password === null) return false;
  }

  try {
    const result = await window.api.saveFile(content, currentFilePath, password);
    if (result.cancelled) return false;

    if (result.success) {
      currentFilePath = result.filePath;
      currentPassword = password;
      const fileName = currentFilePath.split(/[\\/]/).pop();
      fileNameDisplay.textContent = fileName;
      markDirty(false);
      showStatusMessage(getSavedStatusMessage(currentFilePath));
      return true;
    } else {
      await window.api.showErrorDialog(`Error saving file: ${result.error}`);
      return false;
    }
  } catch (error) {
    console.error('File save failed:', error);
    return false;
  }
}

async function handleSaveAs() {
  const content = getEditorMarkdown();
  
  const targetPath = await window.api.saveFileDialog();
  if (!targetPath) return false;
  
  let password = '';
  if (needsEncryptionPassword(targetPath)) {
    password = await promptPassword(true);
    if (password === null) return false;
  }

  try {
    const result = await window.api.saveFile(content, targetPath, password); 
    if (result.cancelled) return false;

    if (result.success) {
      currentFilePath = result.filePath;
      currentPassword = password;
      const fileName = currentFilePath.split(/[\\/]/).pop();
      fileNameDisplay.textContent = fileName;
      markDirty(false);
      showStatusMessage(getSavedStatusMessage(currentFilePath));
      return true;
    } else {
      await window.api.showErrorDialog(`Error saving file: ${result.error}`);
      return false;
    }
  } catch (error) {
    console.error('Save as failed:', error);
    return false;
  }
}

/* =========================================================================
   4. Application Configurations & UI Settings
   ========================================================================= */

const defaultSettings = {
  fontSize: 18,
  lineHeight: 1.6,
  layoutWidth: 2500,
  colorTheme: 'phosphor-green',
  glowBlur: 6,
  crtEffects: false,
  volume: 50,
  soundPreset: 'mechanical',
  autosave: 60
};

function readSettings() {
  try {
    const savedSettings = JSON.parse(localStorage.getItem('mt_settings'));
    return { ...defaultSettings, ...(savedSettings || {}) };
  } catch (error) {
    console.warn('Settings reset after invalid localStorage payload.', error);
    localStorage.removeItem('mt_settings');
    return { ...defaultSettings };
  }
}

function applyCrtEffects(enabled) {
  document.body.classList.toggle('crt-enabled', Boolean(enabled));
  document.body.classList.remove('flicker');
}

function loadSettings() {
  const settings = readSettings();

  // Apply Font Size
  fontSlider.value = settings.fontSize;
  fontVal.textContent = `${settings.fontSize}px`;
  editor.style.fontSize = `${settings.fontSize}px`;

  // Apply Line Spacing
  lineSelect.value = settings.lineHeight;
  editor.style.lineHeight = settings.lineHeight;

  // Apply Column Width
  const widthValue = settings.layoutWidth !== undefined ? settings.layoutWidth : 2500;
  widthSlider.value = widthValue;
  widthVal.textContent = widthValue === 2500 ? '100% (Full)' : `${widthValue}px`;
  editor.style.setProperty('--editor-width', widthValue === 2500 ? '95%' : `${widthValue}px`);

  // Apply Phosphor Theme
  themeSelect.value = settings.colorTheme;
  document.body.className = 'matrix-theme';
  document.body.classList.add(settings.colorTheme);

  // Apply Glow Intensity
  const glowValue = settings.glowBlur !== undefined ? settings.glowBlur : 6;
  glowSlider.value = glowValue;
  glowVal.textContent = `${glowValue}px`;
  document.body.style.setProperty('--glow-blur', `${glowValue}px`);

  // Apply CRT FX & Vignette visibility
  crtCheckbox.checked = settings.crtEffects;
  applyCrtEffects(settings.crtEffects);

  // Apply volume setting
  volSlider.value = settings.volume;
  volVal.textContent = `${settings.volume}%`;
  typewriter.setVolume(settings.volume / 100);

  // Apply Sound preset
  soundSelect.value = settings.soundPreset;
  typewriter.setPreset(settings.soundPreset);

  // Apply Auto-Save Setting
  autosaveSelect.value = settings.autosave;
  setupAutoSaveTimer(settings.autosave);
}

function saveSettings() {
  const settings = {
    fontSize: parseInt(fontSlider.value),
    lineHeight: parseFloat(lineSelect.value),
    layoutWidth: parseInt(widthSlider.value),
    colorTheme: themeSelect.value,
    glowBlur: parseInt(glowSlider.value),
    crtEffects: crtCheckbox.checked,
    volume: parseInt(volSlider.value),
    soundPreset: soundSelect.value,
    autosave: parseInt(autosaveSelect.value)
  };

  localStorage.setItem('mt_settings', JSON.stringify(settings));
  
  // Apply changes immediately
  editor.style.fontSize = `${settings.fontSize}px`;
  fontVal.textContent = `${settings.fontSize}px`;
  
  editor.style.lineHeight = settings.lineHeight;

  editor.style.setProperty('--editor-width', settings.layoutWidth === 2500 ? '95%' : `${settings.layoutWidth}px`);
  widthVal.textContent = settings.layoutWidth === 2500 ? '100% (Full)' : `${settings.layoutWidth}px`;

  document.body.className = 'matrix-theme';
  document.body.classList.add(settings.colorTheme);

  document.body.style.setProperty('--glow-blur', `${settings.glowBlur}px`);
  glowVal.textContent = `${settings.glowBlur}px`;

  if (matrixCanvas && matrixCanvas.classList.contains('active')) {
    cacheRainStyle();
  }

  applyCrtEffects(settings.crtEffects);

  typewriter.setVolume(settings.volume / 100);
  volVal.textContent = `${settings.volume}%`;

  typewriter.setPreset(settings.soundPreset);

  setupAutoSaveTimer(settings.autosave);
}

function setupAutoSaveTimer(seconds) {
  if (autoSaveIntervalId) {
    clearInterval(autoSaveIntervalId);
    autoSaveIntervalId = null;
  }

  if (seconds > 0) {
    autoSaveIntervalId = setInterval(async () => {
      if (currentFilePath && isDirty && !isUnconfirmedDraft) {
        const content = getEditorMarkdown();
        const password = isPlainTextPath(currentFilePath) ? '' : currentPassword;
        const result = await window.api.saveFile(content, currentFilePath, password);
        if (result.success) {
          markDirty(false);
          showStatusMessage(getSavedStatusMessage(currentFilePath, true));
        }
      }
    }, seconds * 1000);
  }
}

/* =========================================================================
   5. Listeners & Setup Initialization
   ========================================================================= */


function shouldPlayKeySound(e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return false;
  if (['Enter', ' ', 'Backspace', 'Delete'].includes(e.key)) return true;
  return e.key.length === 1;
}

// Text editor keyboard triggers
editor.addEventListener('keydown', (e) => {
  // Mechanical typewriter typing sounds
  const isEnter = e.key === 'Enter';
  const isSpace = e.key === ' ';
  if (shouldPlayKeySound(e)) {
    setTimeout(() => typewriter.playClick(isEnter, isSpace), 0);
  }

  if (isSpace) {
    handleMarkdownShortcut(e);
  }

  // Headers keyboard shortcuts
  if (e.ctrlKey) {
    if (e.key === '1') {
      e.preventDefault();
      toggleBlockType('h1');
    } else if (e.key === '2') {
      e.preventDefault();
      toggleBlockType('h2');
    } else if (e.key === '0') {
      e.preventDefault();
      toggleBlockType('div');
    }
  }
});

editor.addEventListener('input', () => {
  updateStats();
  markDirty(true);
});

editor.addEventListener('paste', handlePlainTextPaste);

// Settings interactions
fontSlider.addEventListener('input', () => {
  fontVal.textContent = `${fontSlider.value}px`;
  editor.style.fontSize = `${fontSlider.value}px`;
});

volSlider.addEventListener('input', () => {
  volVal.textContent = `${volSlider.value}%`;
  typewriter.setVolume(volSlider.value / 100);
});

// Save settings when changing toggles or dropdowns
[lineSelect, themeSelect, crtCheckbox, soundSelect, autosaveSelect].forEach(element => {
  element.addEventListener('change', saveSettings);
});

// Real-time slider feedback during drag, saving on change finish
widthSlider.addEventListener('input', () => {
  const widthValText = widthSlider.value === '2500' ? '100% (Full)' : `${widthSlider.value}px`;
  widthVal.textContent = widthValText;
  editor.style.setProperty('--editor-width', widthSlider.value === '2500' ? '95%' : `${widthSlider.value}px`);
});
widthSlider.addEventListener('change', saveSettings);

glowSlider.addEventListener('input', () => {
  glowVal.textContent = `${glowSlider.value}px`;
  document.body.style.setProperty('--glow-blur', `${glowSlider.value}px`);
});
glowSlider.addEventListener('change', saveSettings);

fontSlider.addEventListener('change', saveSettings);
volSlider.addEventListener('change', saveSettings);

// Modal UI Toggles
btnSettings.addEventListener('click', () => {
  settingsModal.classList.remove('hidden');
});

btnCloseSettings.addEventListener('click', () => {
  settingsModal.classList.add('hidden');
  editor.focus();
});

settingsModal.addEventListener('click', (e) => {
  if (e.target === settingsModal) {
    settingsModal.classList.add('hidden');
    editor.focus();
  }
});

searchInput.addEventListener('input', () => {
  refreshSearchMatches(searchInput.value);
});

searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    e.stopPropagation();
    searchState.query = searchInput.value;
    jumpSearchResult(e.shiftKey ? -1 : 1);
  } else if (e.key === 'Escape') {
    e.preventDefault();
    e.stopPropagation();
    closeSearchPrompt();
  } else if (e.ctrlKey && e.key.toLowerCase() === 'g') {
    e.preventDefault();
    e.stopPropagation();
    searchState.query = searchInput.value;
    jumpSearchResult(e.shiftKey ? -1 : 1);
  }
});

// App Actions Click Handlers
btnNew.addEventListener('click', handleNew);
btnOpen.addEventListener('click', handleOpen);
btnSave.addEventListener('click', handleSave);
btnSaveAs.addEventListener('click', handleSaveAs);
btnFullscreen.addEventListener('click', () => window.api.toggleFullscreen());
btnQuit.addEventListener('click', async () => {
  const proceed = await promptUnsavedChanges();
  if (!proceed) return;
  await window.api.quitApp();
});

// Global Shortcuts and Focus Setup
window.addEventListener('keydown', async (e) => {
  const key = e.key.toLowerCase();

  if (e.ctrlKey && !e.shiftKey) {
    if (key === 's') {
      e.preventDefault();
      await handleSave();
    } else if (key === 'o') {
      e.preventDefault();
      await handleOpen();
    } else if (key === 'n') {
      e.preventDefault();
      await handleNew();
    } else if (key === 'q') {
      e.preventDefault();
      const proceed = await promptUnsavedChanges();
      if (!proceed) return;
      await window.api.quitApp();
    } else if (key === 'f') {
      e.preventDefault();
      if (settingsModal.classList.contains('hidden') && passwordModal.classList.contains('hidden')) {
        openSearchPrompt();
      }
    } else if (key === 'g') {
      e.preventDefault();
      if (isSearchOpen()) {
        jumpSearchResult(1);
      } else {
        jumpHeader(1);
      }
    }
  } else if (e.ctrlKey && e.shiftKey) {
    if (key === 's') {
      e.preventDefault();
      await handleSaveAs();
    } else if (key === 'g') {
      e.preventDefault();
      if (isSearchOpen()) {
        jumpSearchResult(-1);
      } else {
        jumpHeader(-1);
      }
    }
  } else if (e.key === 'F11') {
    e.preventDefault();
    await window.api.toggleFullscreen();
  } else if (e.key === 'Escape') {
    e.preventDefault();
    if (isSearchOpen()) {
      closeSearchPrompt();
    } else if (!settingsModal.classList.contains('hidden')) {
      settingsModal.classList.add('hidden');
      editor.focus();
    } else if (!passwordModal.classList.contains('hidden')) {
      btnPasswordCancel.click();
    } else {
      await window.api.toggleFullscreen();
    }
  }
});



function triggerFocus() {
  // Direct instant focus
  editor.focus();
  const range = document.createRange();
  range.selectNodeContents(editor);
  range.collapse(false);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);

  // Layout paint fallback focus
  setTimeout(() => {
    editor.focus();
  }, 50);
}

let nativeCloseHandlerReady = false;

function setupNativeCloseHandler() {
  if (nativeCloseHandlerReady || !window.api?.onNativeCloseRequest) return;
  nativeCloseHandlerReady = true;

  try {
    const maybeUnlisten = window.api.onNativeCloseRequest(async (event) => {
      if (event && typeof event.preventDefault === 'function') {
        event.preventDefault();
      }

      const proceed = await promptUnsavedChanges();
      if (proceed) {
        await window.api.quitApp();
      }
    });

    if (maybeUnlisten && typeof maybeUnlisten.catch === 'function') {
      maybeUnlisten.catch((error) => console.warn('Native close handler failed.', error));
    }
  } catch (error) {
    console.warn('Native close handler unavailable.', error);
  }
}



// Page Initialization Load Process
window.addEventListener('DOMContentLoaded', async () => {
  setupNativeCloseHandler();
  updateTopMenuClearance();
  if ('ResizeObserver' in window) {
    new ResizeObserver(updateTopMenuClearance).observe(topMenu);
  }
  loadSettings();

  const loadedLaunchFile = await loadLaunchFileIfAny();
  if (loadedLaunchFile) {
    triggerFocus();
    return;
  }

  // Try to recover draft after crash or close
  const draftContent = localStorage.getItem('mt_draft_content');
  const draftPath = localStorage.getItem('mt_draft_path');

  if (draftContent) {
    isUnconfirmedDraft = true;

    // Show non-blocking prompt
    const draftPrompt = document.createElement('div');
    draftPrompt.id = 'draft-prompt';
    draftPrompt.style.position = 'fixed';
    draftPrompt.style.bottom = '40px';
    draftPrompt.style.right = '40px';
    draftPrompt.style.padding = '15px';
    draftPrompt.style.background = '#000';
    draftPrompt.style.border = '1px solid var(--border-color)';
    draftPrompt.style.zIndex = '9999';
    draftPrompt.style.display = 'flex';
    draftPrompt.style.flexDirection = 'column';
    draftPrompt.style.gap = '10px';
    draftPrompt.style.fontFamily = "'Share Tech Mono', monospace";
    draftPrompt.style.color = 'var(--text-color)';
    draftPrompt.innerHTML = `
      <div style="font-size: 14px; text-align: center;">An unsaved draft was recovered - Restore or Discard?</div>
      <div style="display: flex; gap: 10px; justify-content: center; margin-top: 5px;">
        <button id="btn-draft-restore" class="btn-primary" style="flex: 1; padding: 5px 10px;">Restore</button>
        <button id="btn-draft-discard" style="flex: 1; padding: 5px 10px;">Discard</button>
      </div>
    `;
    document.body.appendChild(draftPrompt);

    document.getElementById('btn-draft-restore').addEventListener('click', () => {
      currentFilePath = draftPath || null;
      loadMarkdownToEditor(draftContent);
      if (currentFilePath) {
        const fileName = currentFilePath.split(/[\\/]/).pop();
        fileNameDisplay.textContent = fileName;
      } else {
        fileNameDisplay.textContent = 'Untitled Document (Restored)';
      }
      isUnconfirmedDraft = false;
      markDirty(true);
      updateStats();
      showStatusMessage('UNSAVED DRAFT RESTORED');
      draftPrompt.remove();
      triggerFocus();
    });

    document.getElementById('btn-draft-discard').addEventListener('click', () => {
      localStorage.removeItem('mt_draft_content');
      localStorage.removeItem('mt_draft_path');
      isUnconfirmedDraft = false;
      draftPrompt.remove();
      triggerFocus();
    });

    // Set default empty canvas behind the prompt
    loadMarkdownToEditor('');
    updateStats();
    return;
  }

  // Set default empty canvas
  loadMarkdownToEditor('');
  updateStats();
  triggerFocus();
});

/* =========================================================================
   6. Matrix Rain Easter Egg
   ========================================================================= */

const matrixCanvas = document.getElementById('matrix-canvas');
const matrixCtx = matrixCanvas.getContext('2d');
const appLogo = document.querySelector('.menu-brand');
let rainAnimationId = null;
let cachedRainColor = '0, 255, 0';
let cachedRainGlowBlur = 6;
let rainTextLayer = null;
let previousEditorTransition = '';
const matrixGlyphs =
  '\u30a2\u30a1\u30ab\u30b5\u30bf\u30ca\u30cf\u30de\u30e4\u30e3\u30e9\u30ef' +
  '\u30ac\u30b6\u30c0\u30d0\u30d1\u30a4\u30a3\u30ad\u30b7\u30c1\u30cb\u30d2' +
  '\u30df\u30ea\u30f0\u30ae\u30b8\u30c2\u30d3\u30d4\u30a6\u30a5\u30af\u30b9' +
  '\u30c4\u30cc\u30d5\u30e0\u30e6\u30e5\u30eb\u30b0\u30ba\u30d6\u30c5\u30d7' +
  '\u30a8\u30a7\u30b1\u30bb\u30c6\u30cd\u30d8\u30e1\u30ec\u30b2\u30bc\u30c7' +
  '\u30d9\u30da\u30aa\u30a9\u30b3\u30bd\u30c8\u30ce\u30db\u30e2\u30e8\u30e7' +
  '\u30ed\u30b4\u30be\u30c9\u30dc\u30dd\u30f4\u30c3\u30f30123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function resizeMatrixCanvas() {
  const dpr = window.devicePixelRatio || 1;
  matrixCanvas.width = Math.floor(window.innerWidth * dpr);
  matrixCanvas.height = Math.floor(window.innerHeight * dpr);
  matrixCanvas.style.width = `${window.innerWidth}px`;
  matrixCanvas.style.height = `${window.innerHeight}px`;
  matrixCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function cacheRainStyle() {
  const bodyStyle = getComputedStyle(document.body);
  cachedRainColor = bodyStyle.getPropertyValue('--glow-color-rgb').trim() || '0, 255, 0';
  cachedRainGlowBlur = parseFloat(bodyStyle.getPropertyValue('--glow-blur')) || 0;
}

function randomMatrixGlyph() {
  return matrixGlyphs[Math.floor(Math.random() * matrixGlyphs.length)];
}

function removeRainTextLayer() {
  if (rainTextLayer) {
    rainTextLayer.remove();
    rainTextLayer = null;
  }
}

function startMatrixRain() {
  if (matrixCanvas.classList.contains('active')) return;
  
  // Cache the color once before starting the rain
  cacheRainStyle();
  
  // Setup canvas dimensions
  resizeMatrixCanvas();
  
  // Clone editor to measure exact subpixel coordinates of every character
  const editorRect = editor.getBoundingClientRect();
  const computedEditor = getComputedStyle(editor);
  const fontSize = parseInt(computedEditor.fontSize, 10) || 18;
  const editorClone = editor.cloneNode(true);
  editorClone.style.position = 'fixed';
  editorClone.style.top = `${editorRect.top}px`;
  editorClone.style.left = `${editorRect.left}px`;
  editorClone.style.width = `${editorRect.width}px`;
  editorClone.style.height = `${editorRect.height}px`;
  editorClone.style.padding = computedEditor.padding;
  editorClone.style.margin = '0';
  editorClone.style.boxSizing = computedEditor.boxSizing;
  editorClone.style.overflow = 'hidden';
  editorClone.style.opacity = '0'; 
  editorClone.style.pointerEvents = 'none';
  editorClone.style.zIndex = '-1';
  document.body.appendChild(editorClone);

  // Deep wrap all non-whitespace characters in spans
  function wrapTextNodes(node) {
    if (node.nodeType === 3) { 
      const chars = node.nodeValue.split('');
      const fragment = document.createDocumentFragment();
      chars.forEach(char => {
        if (char.trim() === '') {
          fragment.appendChild(document.createTextNode(char));
        } else {
          const span = document.createElement('span');
          span.className = 'matrix-char';
          span.textContent = char;
          fragment.appendChild(span);
        }
      });
      node.parentNode.replaceChild(fragment, node);
    } else if (node.nodeType === 1) {
      Array.from(node.childNodes).forEach(wrapTextNodes);
    }
  }
  
  wrapTextNodes(editorClone);

  removeRainTextLayer();
  rainTextLayer = document.createElement('div');
  rainTextLayer.id = 'matrix-rain-text-layer';
  rainTextLayer.style.position = 'fixed';
  rainTextLayer.style.inset = '0';
  rainTextLayer.style.zIndex = '2001';
  rainTextLayer.style.pointerEvents = 'none';
  rainTextLayer.style.contain = 'layout paint';

  const userDrops = [];
  const dividerDrops = [];
  
  // Extract coordinates
  const spans = editorClone.querySelectorAll('.matrix-char');
  spans.forEach(span => {
    const rect = span.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const spanStyle = getComputedStyle(span);
    const fallingSpan = document.createElement('span');
    fallingSpan.textContent = span.textContent;
    fallingSpan.style.position = 'absolute';
    fallingSpan.style.left = `${rect.left}px`;
    fallingSpan.style.top = `${rect.top}px`;
    fallingSpan.style.font = spanStyle.font;
    fallingSpan.style.lineHeight = spanStyle.lineHeight;
    fallingSpan.style.letterSpacing = spanStyle.letterSpacing;
    fallingSpan.style.color = spanStyle.color;
    fallingSpan.style.textShadow = spanStyle.textShadow;
    fallingSpan.style.whiteSpace = 'pre';
    fallingSpan.style.willChange = 'transform, opacity';
    fallingSpan.style.transform = 'translate3d(0, 0, 0)';
    rainTextLayer.appendChild(fallingSpan);

    userDrops.push({
      el: fallingSpan,
      char: span.textContent,
      x: rect.left + (rect.width / 2),
      top: rect.top,
      yPos: 0,
      falling: false,
      velocity: 0,
      maxSpeed: Math.random() * 5 + 8,
      acceleration: Math.random() * 0.35 + 0.65,
      delay: Math.random() * 80 + 10,
      frames: 0
    });
  });

  const headerMarkers = editorClone.querySelectorAll('h1, h2');
  headerMarkers.forEach((header) => {
    const rect = header.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const headerStyle = getComputedStyle(header);
    const markerText = header.tagName.toLowerCase() === 'h1' ? '# ' : '## ';
    const markerSpan = document.createElement('span');
    markerSpan.textContent = markerText;
    markerSpan.style.position = 'absolute';
    markerSpan.style.left = `${rect.left}px`;
    markerSpan.style.top = `${rect.top}px`;
    markerSpan.style.font = headerStyle.font;
    markerSpan.style.lineHeight = headerStyle.lineHeight;
    markerSpan.style.letterSpacing = headerStyle.letterSpacing;
    markerSpan.style.color = `rgba(${cachedRainColor}, 0.55)`;
    markerSpan.style.textShadow = 'none';
    markerSpan.style.whiteSpace = 'pre';
    markerSpan.style.willChange = 'transform, opacity';
    markerSpan.style.transform = 'translate3d(0, 0, 0)';
    rainTextLayer.appendChild(markerSpan);

    userDrops.push({
      el: markerSpan,
      char: markerText,
      x: rect.left + (markerText.length * fontSize * 0.32),
      top: rect.top,
      yPos: 0,
      falling: false,
      velocity: 0,
      maxSpeed: Math.random() * 5 + 8,
      acceleration: Math.random() * 0.35 + 0.65,
      delay: Math.random() * 80 + 10,
      frames: 0
    });
  });

  const dividers = editorClone.querySelectorAll('hr');
  dividers.forEach((divider) => {
    const rect = divider.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const segmentWidth = Math.max(5, Math.min(10, fontSize * 0.48));
    const segmentGap = 2;
    const segmentCount = Math.max(1, Math.floor(rect.width / (segmentWidth + segmentGap)));

    for (let i = 0; i < segmentCount; i++) {
      const progress = segmentCount <= 1 ? 0 : i / (segmentCount - 1);
      const alpha = Math.max(0.05, 0.86 * (1 - progress));
      const fragment = document.createElement('span');
      fragment.style.position = 'absolute';
      fragment.style.left = `${rect.left + (i * (segmentWidth + segmentGap))}px`;
      fragment.style.top = `${rect.top + (rect.height / 2)}px`;
      fragment.style.width = `${segmentWidth}px`;
      fragment.style.height = '1px';
      fragment.style.background = `rgba(${cachedRainColor}, ${alpha})`;
      fragment.style.boxShadow = `0 0 ${Math.max(4, cachedRainGlowBlur)}px rgba(${cachedRainColor}, ${alpha})`;
      fragment.style.transform = 'translate3d(0, 0, 0) scaleY(1)';
      fragment.style.transformOrigin = 'center top';
      fragment.style.willChange = 'transform, opacity, width';
      rainTextLayer.appendChild(fragment);

      dividerDrops.push({
        el: fragment,
        x: rect.left + (i * (segmentWidth + segmentGap)) + (segmentWidth / 2),
        top: rect.top + (rect.height / 2),
        yPos: 0,
        falling: false,
        velocity: 0,
        maxSpeed: Math.random() * 4 + 7,
        acceleration: Math.random() * 0.3 + 0.45,
        delay: Math.random() * 54 + 22 + (progress * 28),
        frames: 0,
        alpha,
        width: segmentWidth
      });
    }
  });

  document.body.appendChild(rainTextLayer);
  document.body.removeChild(editorClone);

  matrixCanvas.classList.add('active');

  // Hide the real editor only after the pixel-matched text layer exists.
  previousEditorTransition = editor.style.transition;
  editor.style.transition = 'none';
  editor.style.opacity = '0';

  // Setup classic drops above the viewport so they arrive after the text releases.
  const columnWidth = Math.max(11, Math.floor(fontSize * 0.84));
  const columns = Math.floor(window.innerWidth / columnWidth) + 2;
  const rainColumns = Array.from({ length: columns }, (_, index) => ({
    x: index * columnWidth + (columnWidth / 2),
    y: (Math.random() * -26) - 5,
    speed: Math.random() * 0.5 + 0.62,
    length: Math.floor(Math.random() * 14) + 13,
    startFrame: Math.floor(Math.random() * 72) + 62 + ((index % 5) * 3)
  }));
  
  let rainTimer = 0;
  
  function draw() {
    matrixCtx.shadowBlur = 0;
    matrixCtx.shadowColor = 'transparent';
    matrixCtx.fillStyle = 'rgba(0, 0, 0, 0.15)'; // Trail length
    matrixCtx.fillRect(0, 0, window.innerWidth, window.innerHeight);
    
    matrixCtx.fillStyle = `rgb(${cachedRainColor})`;
    matrixCtx.shadowColor = `rgba(${cachedRainColor}, 0.85)`;
    matrixCtx.shadowBlur = cachedRainGlowBlur;
    matrixCtx.font = `${computedEditor.fontSize} ${computedEditor.fontFamily}`;
    matrixCtx.textAlign = 'center';
    matrixCtx.textBaseline = 'top'; // Matches getBoundingClientRect top
    
    rainTimer++;
    
    // 1. Process user text drops in DOM so the handoff is pixel-stable.
    for (let i = 0; i < userDrops.length; i++) {
      const drop = userDrops[i];
      
      if (!drop.falling) {
        drop.frames++;
        if (drop.frames > drop.delay) {
          drop.falling = true;
        }
      } else {
        drop.velocity = Math.min(drop.maxSpeed, drop.velocity + drop.acceleration);
        drop.yPos += drop.velocity;
      }

      const displayChar = drop.falling && drop.yPos > fontSize && Math.random() > 0.93
        ? randomMatrixGlyph()
        : drop.char;
      drop.el.textContent = displayChar;

      if (drop.falling && drop.top + drop.yPos < window.innerHeight + 50) {
        matrixCtx.fillStyle = `rgba(${cachedRainColor}, 0.72)`;
        matrixCtx.shadowBlur = cachedRainGlowBlur + 2;
        matrixCtx.fillText(displayChar, drop.x, drop.top + drop.yPos);
      }

      const absoluteY = drop.top + drop.yPos;
      const fade = Math.max(0, 1 - ((absoluteY - window.innerHeight * 0.78) / 260));
      drop.el.style.opacity = String(Math.min(1, fade));
      drop.el.style.transform = `translate3d(0, ${drop.yPos}px, 0)`;
    }

    // 1b. Divider traces melt into short luminous drips instead of vanishing.
    for (let i = 0; i < dividerDrops.length; i++) {
      const drop = dividerDrops[i];

      if (!drop.falling) {
        drop.frames++;
        if (drop.frames > drop.delay) {
          drop.falling = true;
        }
      } else {
        drop.velocity = Math.min(drop.maxSpeed, drop.velocity + drop.acceleration);
        drop.yPos += drop.velocity;
      }

      const absoluteY = drop.top + drop.yPos;
      const fade = Math.max(0, 1 - ((absoluteY - window.innerHeight * 0.74) / 250));
      const stretch = drop.falling ? Math.min(18, 1 + (drop.velocity * 2.5)) : 1;
      const width = drop.falling ? Math.max(2, drop.width - (drop.yPos / 34)) : drop.width;

      drop.el.style.width = `${width}px`;
      drop.el.style.opacity = String(Math.min(drop.alpha, fade));
      drop.el.style.transform = `translate3d(0, ${drop.yPos}px, 0) scaleY(${stretch})`;

      if (drop.falling && absoluteY < window.innerHeight + 50) {
        matrixCtx.fillStyle = `rgba(${cachedRainColor}, ${Math.min(0.64, drop.alpha)})`;
        matrixCtx.shadowBlur = cachedRainGlowBlur + 2;
        matrixCtx.fillText(randomMatrixGlyph(), drop.x, absoluteY);
      }
    }
    
    // 2. Let the larger Matrix rain arrive after the user text has begun to fall.
    if (rainTimer > 54) {
      for (let i = 0; i < rainColumns.length; i++) {
        const drop = rainColumns[i];
        if (rainTimer < drop.startFrame) continue;

        for (let trail = 0; trail < drop.length; trail++) {
          const y = (drop.y - trail) * fontSize;
          if (y < -fontSize || y > window.innerHeight + fontSize) continue;

          const trailRatio = trail / drop.length;
          const alpha = trail === 0 ? 0.98 : Math.max(0.05, (1 - trailRatio) * 0.42);
          const glyph = randomMatrixGlyph();

          if (trail === 0) {
            matrixCtx.fillStyle = 'rgba(235, 255, 235, 0.95)';
            matrixCtx.shadowBlur = cachedRainGlowBlur + 8;
          } else {
            matrixCtx.fillStyle = `rgba(${cachedRainColor}, ${alpha})`;
            matrixCtx.shadowBlur = Math.max(0, cachedRainGlowBlur * (1 - trailRatio));
          }

          matrixCtx.fillText(glyph, drop.x, y);
        }

        drop.y += drop.speed;
        if ((drop.y - drop.length) * fontSize > window.innerHeight && Math.random() > 0.94) {
          drop.y = (Math.random() * -58) - 10;
          drop.speed = Math.random() * 0.5 + 0.62;
          drop.length = Math.floor(Math.random() * 14) + 13;
          drop.startFrame = rainTimer + Math.floor(Math.random() * 34);
        }
      }
    }
    
    rainAnimationId = requestAnimationFrame(draw);
  }
  
  // Start loop
  rainAnimationId = requestAnimationFrame(draw);
}

function stopMatrixRain() {
  if (!matrixCanvas.classList.contains('active')) return;
  
  cancelAnimationFrame(rainAnimationId);
  matrixCanvas.classList.remove('active');
  
  // Clear canvas completely
  matrixCtx.shadowBlur = 0;
  matrixCtx.shadowColor = 'transparent';
  matrixCtx.setTransform(1, 0, 0, 1, 0, 0);
  matrixCtx.clearRect(0, 0, matrixCanvas.width, matrixCanvas.height);
  removeRainTextLayer();
  
  // Restore editor
  editor.style.opacity = '1';
  editor.style.transition = previousEditorTransition;
  previousEditorTransition = '';
}

if (appLogo) appLogo.addEventListener('click', startMatrixRain);
if (matrixCanvas) matrixCanvas.addEventListener('click', stopMatrixRain);
window.addEventListener('resize', () => {
  updateTopMenuClearance();
  stopMatrixRain();
});
