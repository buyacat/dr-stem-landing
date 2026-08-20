/* ============================================================
   Dr.STEM Translation Panel — vanilla JS, browser-only
   Self-contained: no imports. Talks to Bitbucket Cloud REST API.
   ============================================================ */

const WORKSPACE = 'eddyorgua';
const REPO = 'drstem-landing';
const BRANCH = 'master';
const API_BASE = 'https://api.bitbucket.org/2.0';



const DATA_FILES = [
  'meta', 'nav', 'hero', 'advantages', 'includes', 'kits',
  'sensors', 'topics', 'software', 'ai', 'game', 'cta', 'footer',
];

const FILE_LABELS = {
  meta: 'SEO & Meta',
  nav: 'Navigation',
  hero: 'Hero',
  advantages: 'Advantages',
  includes: 'Includes',
  kits: 'Kits',
  sensors: 'Sensors',
  topics: 'Topics',
  software: 'Software',
  ai: 'AI',
  game: 'Game',
  cta: 'CTA / Form',
  footer: 'Footer',
};

function isReadOnlyPath(path) {
  const last = path[path.length - 1];
  const parent = path.length >= 2 ? path[path.length - 2] : null;
  if (last === 'key' || last === 'color' || last === 'icon' || last === 'num') return true;
  if (last === 'name' || last === 'type' || last === 'required' || last === 'rows') return true;
  if (last === 'id') return true;
  if (last === 'sensors' && parent !== null && typeof parent === 'number') return true;
  return false;
}

const TOKEN_KEY = 'drstem_admin_token';
function getToken() { return localStorage.getItem(TOKEN_KEY); }
function setToken(t) { localStorage.setItem(TOKEN_KEY, t); }
function clearToken() { localStorage.removeItem(TOKEN_KEY); }

/* ---------- API ---------- */
function apiHeaders(token) {
  return { Authorization: 'Bearer ' + token, Accept: 'application/json' };
}

async function fetchFile(token, locale, file) {
  let url, headers;
  url = API_BASE + '/repositories/' + WORKSPACE + '/' + REPO + '/src/' + BRANCH + '/src/data/' + locale + '/' + file + '.json';
  headers = apiHeaders(token);
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error('Fetch ' + locale + '/' + file + '.json failed (' + res.status + '): ' + body);
  }
  return res.json();
}

async function getBranchHead(token) {
  const url = API_BASE + '/repositories/' + WORKSPACE + '/' + REPO + '/refs/branches/' + BRANCH;
  const res = await fetch(url, { headers: apiHeaders(token) });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error('Fetch branch head failed (' + res.status + '): ' + body);
  }
  const data = await res.json();
  return data.target && data.target.hash;
}

async function commitToRepo(token, files, message, branch) {
  const url = API_BASE + '/repositories/' + WORKSPACE + '/' + REPO + '/src';
  const form = new FormData();
  form.append('message', message);
  form.append('branch', branch);
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const blob = new Blob([f.content], { type: 'application/json' });
    form.append(f.path, blob);
  }
  const body = form;

  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token },
    body,
  });

  if (!res.ok) {
    const bodyText = await res.text().catch(() => '');
    throw new Error('Commit failed (' + res.status + '): ' + bodyText);
  }
}

/* ---------- helpers ---------- */
function deepClone(v) { return JSON.parse(JSON.stringify(v)); }
function serializeJSON(obj) { return JSON.stringify(obj, null, 2) + '\n'; }
function pathString(path) {
  return path.map(function (p) { return typeof p === 'number' ? '[' + p + ']' : p; }).join('.');
}
function containsHtml(s) { return /<[a-z][^>]*>/i.test(s); }

function h(tag, attrs, children) {
  attrs = attrs || {};
  children = children || [];
  var e = document.createElement(tag);
  for (var k in attrs) {
    if (Object.prototype.hasOwnProperty.call(attrs, k)) {
      var v = attrs[k];
      if (v === true) { e.setAttribute(k, ''); }
      else if (v !== false && v !== undefined && v !== null) { e.setAttribute(k, String(v)); }
    }
  }
  for (var i = 0; i < children.length; i++) {
    var c = children[i];
    if (c instanceof Node) e.appendChild(c);
    else e.appendChild(document.createTextNode(String(c)));
  }
  return e;
}

function toggle(el, show) {
  if (!el) return;
  if (show) el.classList.remove('hidden');
  else el.classList.add('hidden');
}

/* ---------- sanitization ----------
   Translation strings are loaded into a contenteditable element via
   innerHTML and may have been edited by other users with repo-write
   access, so they're treated as untrusted: strip everything except a
   small allowlist of formatting tags/attributes before rendering. */
var WYSIWYG_ALLOWED_TAGS = ['B', 'I', 'U', 'STRONG', 'EM', 'A', 'P', 'BR', 'SPAN'];
var WYSIWYG_SAFE_HREF = /^(https?:|mailto:|tel:|\/|#)/i;

function sanitizeHtml(html) {
  var template = document.createElement('template');
  template.innerHTML = html;
  sanitizeFragment(template.content);
  return template.innerHTML;
}

function sanitizeFragment(node) {
  var children = Array.prototype.slice.call(node.childNodes);
  for (var i = 0; i < children.length; i++) {
    var child = children[i];
    if (child.nodeType === Node.ELEMENT_NODE) {
      if (WYSIWYG_ALLOWED_TAGS.indexOf(child.tagName) === -1) {
        while (child.firstChild) node.insertBefore(child.firstChild, child);
        node.removeChild(child);
        continue;
      }
      var attrs = Array.prototype.slice.call(child.attributes);
      for (var j = 0; j < attrs.length; j++) {
        var attr = attrs[j];
        if (child.tagName === 'A' && attr.name === 'href' && WYSIWYG_SAFE_HREF.test(attr.value.trim())) {
          continue;
        }
        child.removeAttribute(attr.name);
      }
      if (child.tagName === 'A') {
        child.setAttribute('rel', 'noopener noreferrer');
        child.setAttribute('target', '_blank');
      }
      sanitizeFragment(child);
    } else if (child.nodeType !== Node.TEXT_NODE) {
      node.removeChild(child);
    }
  }
}

function createWysiwyg(initialValue, onChange) {
  var wrap = h('div', { class: 'wysiwyg' }, []);
  var toolbar = h('div', { class: 'wysiwyg-toolbar' }, []);
  var editor = h('div', { class: 'wysiwyg-editor', contenteditable: 'true', 'data-placeholder': 'Type here…' }, []);

  var buttons = [
    { label: 'B', cmd: 'bold' },
    { label: 'I', cmd: 'italic' },
    { label: 'U', cmd: 'underline' },
    { label: '🔗', cmd: 'createLink', prompt: 'Enter URL' },
  ];

  for (var i = 0; i < buttons.length; i++) {
    var btn = h('button', { type: 'button' }, [buttons[i].label]);
    btn.addEventListener('click', (function (b) {
      return function (e) {
        e.preventDefault();
        editor.focus();
        if (b.prompt) {
          var url = prompt(b.prompt, 'https://');
          if (url) document.execCommand(b.cmd, false, url);
        } else {
          document.execCommand(b.cmd, false, null);
        }
        emitChange();
      };
    })(buttons[i]));
    toolbar.appendChild(btn);
  }

  editor.innerHTML = sanitizeHtml(initialValue);

  function emitChange() {
    var clean = sanitizeHtml(editor.innerHTML);
    if (clean !== editor.innerHTML) editor.innerHTML = clean;
    onChange(clean);
  }

  editor.addEventListener('input', emitChange);

  wrap.appendChild(toolbar);
  wrap.appendChild(editor);
  return wrap;
}

/* ---------- App State ---------- */
var token = getToken();
var files = {};
var edits = new Map();
var originalHash = null;
var currentFile = null;
var saving = false;

/* ---------- DOM refs ---------- */
var elLogin = document.getElementById('admin-login');
var elPanel = document.getElementById('admin-panel');
var elTokenInput = document.getElementById('token-input');
var elLoginForm = document.getElementById('login-form');
var elTokenBadge = document.getElementById('token-badge');
var elLogoutBtn = document.getElementById('logout-btn');
var elNav = document.getElementById('admin-nav');
var elBanner = document.getElementById('admin-banner');
var elDirtyCount = document.getElementById('admin-dirty-count');
var elSaveBtn = document.getElementById('admin-save-btn');
var elEditor = document.getElementById('admin-editor');
var elLoader = document.getElementById('admin-loader');

/* ---------- init ---------- */
function init() {
  elLoginForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var t = elTokenInput.value.trim();
    if (!t) return;
    setToken(t);
    token = t;
    showPanel();
  });

  elLogoutBtn.addEventListener('click', function () {
    clearToken();
    token = null;
    files = {};
    edits.clear();
    showLogin();
  });

  elSaveBtn.addEventListener('click', function () {
    saveChanges();
  });

  if (token) {
    showPanel();
  } else {
    showLogin();
  }
}

function showLogin() {
  toggle(elLogin, true);
  toggle(elPanel, false);
}

function showPanel() {
  toggle(elLogin, false);
  toggle(elPanel, true);
  elTokenBadge.textContent = 'Token: ' + (token || '').slice(-4).padStart(4, '*');
  loadData();
}

/* ---------- sidebar ---------- */
function renderSidebar() {
  elNav.innerHTML = '';
  for (var i = 0; i < DATA_FILES.length; i++) {
    var file = DATA_FILES[i];
    var state = files[file];
    var btn = document.createElement('button');
    btn.className = 'admin-nav-item' + (currentFile === file ? ' active' : '') + (state && state.dirty ? ' dirty' : '');
    btn.type = 'button';
    btn.textContent = FILE_LABELS[file];
    btn.addEventListener('click', (function (f) {
      return function () {
        currentFile = f;
        renderSidebar();
        renderEditor();
      };
    })(file));
    elNav.appendChild(btn);
  }
}

/* ---------- data loading ---------- */
async function loadData() {
  toggle(elLoader, true);
  elEditor.innerHTML = '';
  elBanner.classList.add('hidden');

  if (!token) return;
  try {
    originalHash = await getBranchHead(token);
  } catch (e) {
    elBanner.textContent = 'Failed to load branch head. Check your token.';
    elBanner.className = 'admin-banner error';
    toggle(elBanner, true);
    toggle(elLoader, false);
    return;
  }

  var errors = [];
  var results = await Promise.all(
    DATA_FILES.map(async function (file) {
      try {
        var [uk, en] = await Promise.all([
          fetchFile(token, 'uk', file),
          fetchFile(token, 'en', file),
        ]);
        return { file: file, uk: uk, en: en, ok: true, error: null };
      } catch (e) {
        errors.push(file + ': ' + e.message);
        return { file: file, uk: null, en: null, ok: false, error: e.message };
      }
    })
  );

  var failed = 0;
  for (var i = 0; i < results.length; i++) {
    var r = results[i];
    if (!r.ok || r.uk === null || r.en === null) { failed++; continue; }
    files[r.file] = {
      uk: r.uk, en: r.en,
      originalUk: deepClone(r.uk), originalEn: deepClone(r.en),
      dirty: false,
    };
  }

  toggle(elLoader, false);
  if (failed > 0) {
    elBanner.textContent = 'Warning: ' + failed + ' file(s) failed to load. ' + (errors[0] || '');
    elBanner.className = 'admin-banner error';
    toggle(elBanner, true);
  }

  if (results.length > 0 && results[0].ok) {
    currentFile = results[0].file;
  }
  renderSidebar();
  renderEditor();
}

/* ---------- editor ---------- */
function renderEditor() {
  elEditor.innerHTML = '';

  var dirtyCount = DATA_FILES.filter(function (f) { return files[f] && files[f].dirty; }).length;
  elDirtyCount.textContent = dirtyCount > 0 ? dirtyCount + ' file(s) changed' : 'No changes';
  elSaveBtn.disabled = dirtyCount === 0 || saving;
  elSaveBtn.textContent = saving ? 'Saving…' : 'Save changes';

  if (currentFile) {
    var state = files[currentFile];
    if (state) {
      renderValue(elEditor, currentFile, [], state.uk, state.en);
    } else {
      elEditor.appendChild(h('p', { class: 'admin-error' }, ['Failed to load this file.']));
    }
  } else {
    elEditor.appendChild(h('p', {}, ['Select a file from the sidebar.']));
  }
}

function renderValue(container, file, path, ukVal, enVal) {
  var bothStrings = typeof ukVal === 'string' && typeof enVal === 'string';
  var bothNumbers = typeof ukVal === 'number' && typeof enVal === 'number';
  var bothBools = typeof ukVal === 'boolean' && typeof enVal === 'boolean';
  var bothNull = ukVal === null && enVal === null;
  var bothObjects = ukVal !== null && enVal !== null && typeof ukVal === 'object' && !Array.isArray(ukVal) && typeof enVal === 'object' && !Array.isArray(enVal);
  var bothArrays = Array.isArray(ukVal) && Array.isArray(enVal);

  var readOnly = isReadOnlyPath(path);
  var pathStr = pathString(path);

  if (bothStrings || bothNumbers || bothBools || bothNull) {
    var row = h('div', { class: 'admin-row' + (readOnly ? ' readonly' : '') }, []);
    var labelText = path.length ? String(path[path.length - 1]) : 'root';
    var label = h('label', { class: 'admin-key' }, [labelText]);
    row.appendChild(label);

    var cell = h('div', { class: 'admin-cells' }, []);
    var locales = ['uk', 'en'];
    for (var li = 0; li < locales.length; li++) {
      var locale = locales[li];
      var val = locale === 'uk' ? String(ukVal != null ? ukVal : '') : String(enVal != null ? enVal : '');
      var editKey = locale + ':' + file + ':' + pathStr;
      var hasEdit = edits.has(editKey);
      var displayVal = hasEdit ? edits.get(editKey) : val;
      var isEmpty = displayVal === '';
      var hasHtml = containsHtml(displayVal);
      var useTextarea = displayVal.length > 80 || hasHtml;

      var wrapper = h('div', { class: 'admin-cell' + (isEmpty ? ' empty' : '') + (hasHtml ? ' has-html' : '') }, []);
      var badge = h('span', { class: 'admin-locale-badge' }, [locale.toUpperCase()]);
      wrapper.appendChild(badge);

      if (readOnly) {
        wrapper.appendChild(h('div', { class: 'field' }, [
          h('input', { type: 'text', value: displayVal, disabled: true })
        ]));
      } else {
        var wysiwyg = createWysiwyg(displayVal, (function (ek, original) {
          return function (newVal) {
            if (newVal !== original) {
              edits.set(ek, newVal);
              // Also update the current state object so saveChanges() can use state.uk directly
              var ekParts = ek.split(':');
              if (ekParts.length >= 3) {
                var ekLocale = ekParts[0];
                var ekFile = ekParts[1];
                var ekPath = parsePath(ekParts.slice(2).join(':'));
                var ekState = files[ekFile];
                if (ekState && ekState[ekLocale]) {
                  setValueAtPath(ekState[ekLocale], ekPath, newVal);
                }
              }
            } else {
              edits.delete(ek);
            }
            updateDirty();
            renderEditor();
            renderSidebar();
          };
        })(editKey, val));

        wrapper.appendChild(wysiwyg);
      }

      cell.appendChild(wrapper);
    }
    row.appendChild(cell);
    container.appendChild(row);
    return;
  }

  if (bothArrays) {
    var ukArr = ukVal;
    var enArr = enVal;
    var maxLen = Math.max(ukArr.length, enArr.length);
    var fieldset = h('fieldset', { class: 'admin-fieldset' }, []);
    var legendText = path.length ? String(path[path.length - 1]) : 'root';
    var legend = h('legend', { class: 'admin-legend' }, [legendText]);
    fieldset.appendChild(legend);
    for (var ai = 0; ai < maxLen; ai++) {
      var itemWrapper = h('div', {
        class: 'array-item',
        draggable: 'true',
        'data-index': String(ai),
        'data-path': pathString(path),
        'data-file': file
      }, []);
      var handle = h('div', { class: 'drag-handle', title: 'Drag to reorder' }, ['⋮⋮']);
      itemWrapper.appendChild(handle);
      var contentContainer = h('div', { class: 'array-item-content' }, []);
      renderValue(contentContainer, file, path.concat([ai]), ukArr[ai] != null ? ukArr[ai] : null, enArr[ai] != null ? enArr[ai] : null);
      itemWrapper.appendChild(contentContainer);
      fieldset.appendChild(itemWrapper);
      addDnDHandlers(itemWrapper);
    }
    container.appendChild(fieldset);
    return;
  }

  if (bothObjects) {
    var ukObj = ukVal;
    var enObj = enVal;
    var allKeys = new Set(Object.keys(ukObj).concat(Object.keys(enObj)));
    var fieldset2 = h('fieldset', { class: 'admin-fieldset' }, []);
    var legendText2 = path.length ? String(path[path.length - 1]) : 'root';
    var legend2 = h('legend', { class: 'admin-legend' }, [legendText2]);
    fieldset2.appendChild(legend2);
    allKeys.forEach(function (key) {
      renderValue(fieldset2, file, path.concat([key]), ukObj[key], enObj[key]);
    });
    container.appendChild(fieldset2);
    return;
  }

  var row2 = h('div', { class: 'admin-row mismatch' }, [
    h('span', { class: 'admin-key' }, [path.length ? String(path[path.length - 1]) : 'root']),
    h('span', {}, ['Type mismatch between locales']),
  ]);
  container.appendChild(row2);
}

function updateDirty() {
  for (var i = 0; i < DATA_FILES.length; i++) {
    var file = DATA_FILES[i];
    var state = files[file];
    if (!state) continue;
    var hasEdits = false;
    var ukPrefix = 'uk:' + file + ':';
    var enPrefix = 'en:' + file + ':';
    for (var k of edits.keys()) {
      if (k.startsWith(ukPrefix) || k.startsWith(enPrefix)) {
        hasEdits = true;
        break;
      }
    }
    // Also detect structural changes (e.g., DND reordering)
    var structurallyChanged = false;
    if (state.uk && state.originalUk) {
      try { if (JSON.stringify(state.uk) !== JSON.stringify(state.originalUk)) structurallyChanged = true; } catch (e) {}
    }
    if (state.en && state.originalEn) {
      try { if (JSON.stringify(state.en) !== JSON.stringify(state.originalEn)) structurallyChanged = true; } catch (e) {}
    }
    state.dirty = hasEdits || structurallyChanged;
  }
}

/* ---------- save ---------- */
async function saveChanges() {
  if (!token || saving) return;
  var dirtyFiles = DATA_FILES.filter(function (f) { return files[f] && files[f].dirty; });
  if (!dirtyFiles.length) return;

  saving = true;
  renderEditor();
  renderSidebar();

  try {
    var currentHash = await getBranchHead(token);
    if (originalHash && currentHash !== originalHash) {
      var proceed = confirm(
        'The repository has changed since you loaded this page.\n\n' +
        'Reload to get the latest changes, or proceed to overwrite (last-write-wins).\n\n' +
        'Proceed anyway?'
      );
      if (!proceed) {
        saving = false;
        renderEditor();
        renderSidebar();
        return;
      }
      originalHash = currentHash;
    }

    var changedFiles = [];
    for (var i = 0; i < dirtyFiles.length; i++) {
      var file = dirtyFiles[i];
      var state = files[file];
      if (!state) continue;
      // Use the current state (includes both text edits and structural changes like DND)
      var ukObj = deepClone(state.uk);
      var enObj = deepClone(state.en);
      changedFiles.push({ path: 'src/data/uk/' + file + '.json', content: serializeJSON(ukObj) });
      changedFiles.push({ path: 'src/data/en/' + file + '.json', content: serializeJSON(enObj) });
      state.originalUk = deepClone(ukObj);
      state.originalEn = deepClone(enObj);
      state.dirty = false;
    }

    var editsToDelete = [];
    for (var entry of edits.entries()) {
      var key = entry[0];
      var parts = key.split(':');
      if (parts.length >= 2 && dirtyFiles.indexOf(parts[1]) >= 0) {
        editsToDelete.push(key);
      }
    }
    for (var di = 0; di < editsToDelete.length; di++) {
      edits.delete(editsToDelete[di]);
    }

    var message = 'i18n: update ' + dirtyFiles.join(', ') + ' (uk, en) via translation panel';
    await commitToRepo(token, changedFiles, message, BRANCH);

    originalHash = await getBranchHead(token);

    elBanner.textContent = 'Saved to repository — appears on the site after the next deploy.';
    elBanner.className = 'admin-banner success';
    toggle(elBanner, true);
    setTimeout(function () { toggle(elBanner, false); }, 6000);
  } catch (e) {
    var msg = e instanceof Error ? e.message : 'Unknown error';
    elBanner.textContent = 'Save failed: ' + msg;
    elBanner.className = 'admin-banner error';
    toggle(elBanner, true);
  } finally {
    saving = false;
    renderEditor();
    renderSidebar();
  }
}

function parsePath(pathStr) {
  var parts = [];
  var re = /\[([0-9]+)\]|\.?([^\.\[]+)/g;
  var m;
  while ((m = re.exec(pathStr)) !== null) {
    if (m[1] !== undefined) { parts.push(parseInt(m[1], 10)); }
    else if (m[2] !== undefined) { parts.push(m[2]); }
  }
  return parts;
}

function setValueAtPath(root, path, value) {
  var current = root;
  for (var i = 0; i < path.length - 1; i++) {
    var key = path[i];
    if (typeof key === 'number') {
      if (!Array.isArray(current)) return;
      current = current[key];
    } else {
      if (typeof current !== 'object' || current === null || Array.isArray(current)) return;
      current = current[key];
    }
    if (current === undefined || current === null) return;
  }
  var last = path[path.length - 1];
  if (typeof last === 'number') {
    if (Array.isArray(current)) current[last] = value;
  } else {
    if (typeof current === 'object' && current !== null && !Array.isArray(current)) {
      current[last] = value;
    }
  }
}

function getValueAtPath(root, path) {
  var current = root;
  for (var i = 0; i < path.length; i++) {
    var key = path[i];
    if (typeof key === 'number') {
      if (!Array.isArray(current)) return undefined;
      current = current[key];
    } else {
      if (typeof current !== 'object' || current === null || Array.isArray(current)) return undefined;
      current = current[key];
    }
    if (current === undefined) return undefined;
  }
  return current;
}

function reorderInPlace(arr, fromIndex, toIndex) {
  if (fromIndex < 0 || fromIndex >= arr.length) return;
  if (toIndex < 0 || toIndex >= arr.length) return;
  var item = arr.splice(fromIndex, 1)[0];
  arr.splice(toIndex, 0, item);
}

function reorderArray(file, path, fromIndex, toIndex) {
  var state = files[file];
  if (!state) return;

  // Reorder the live working copy directly (already reflects prior edits/reorders).
  // originalUk/originalEn stay untouched so updateDirty() keeps detecting this
  // as a structural change until the next save.
  var ukArr = getValueAtPath(state.uk, path);
  var enArr = getValueAtPath(state.en, path);

  if (!Array.isArray(ukArr) || !Array.isArray(enArr)) return;

  reorderInPlace(ukArr, fromIndex, toIndex);
  reorderInPlace(enArr, fromIndex, toIndex);

  // Clear all edits for this file (they may have stale indices)
  var prefixes = ['uk:' + file + ':', 'en:' + file + ':'];
  var keysToDelete = [];
  for (var key of edits.keys()) {
    for (var pi = 0; pi < prefixes.length; pi++) {
      if (key.startsWith(prefixes[pi])) {
        keysToDelete.push(key);
        break;
      }
    }
  }
  for (var ki = 0; ki < keysToDelete.length; ki++) {
    edits.delete(keysToDelete[ki]);
  }

  state.dirty = true;
  renderEditor();
  renderSidebar();
}

/* ---------- drag & drop ---------- */
var dragSrcEl = null;
var dragSrcIndex = null;
var dragSrcPath = null;
var dragSrcFile = null;

function addDnDHandlers(el) {
  el.addEventListener('dragstart', function (e) {
    dragSrcEl = el;
    dragSrcIndex = parseInt(el.getAttribute('data-index'), 10);
    dragSrcPath = el.getAttribute('data-path');
    dragSrcFile = el.getAttribute('data-file');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(dragSrcIndex));
    el.classList.add('dragging');
  });

  el.addEventListener('dragend', function () {
    el.classList.remove('dragging');
    document.querySelectorAll('.array-item').forEach(function (item) {
      item.classList.remove('drag-over');
    });
    dragSrcEl = null;
    dragSrcIndex = null;
    dragSrcPath = null;
    dragSrcFile = null;
  });

  el.addEventListener('dragover', function (e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    return false;
  });

  el.addEventListener('dragenter', function () {
    if (el !== dragSrcEl) {
      el.classList.add('drag-over');
    }
  });

  el.addEventListener('dragleave', function () {
    el.classList.remove('drag-over');
  });

  el.addEventListener('drop', function (e) {
    e.stopPropagation();
    e.preventDefault();

    if (dragSrcEl !== el) {
      var toIndex = parseInt(el.getAttribute('data-index'), 10);
      var toPath = el.getAttribute('data-path');
      var toFile = el.getAttribute('data-file');

      if (dragSrcFile === toFile && dragSrcPath === toPath) {
        reorderArray(dragSrcFile, parsePath(dragSrcPath), dragSrcIndex, toIndex);
      }
    }

    document.querySelectorAll('.array-item').forEach(function (item) {
      item.classList.remove('drag-over');
    });
    return false;
  });
}

/* ---------- mount ---------- */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
