// renderer.js
const fs = require('fs');
const path = require('path');
const cryptoModule = require('./crypto'); // your crypto.js implementing create/unlock/encrypt/decrypt
const nodeCrypto = require('crypto');

const NOTES_FILE = path.join(__dirname, 'notes.enc');
const SALT_FILE = path.join(__dirname, 'salt.enc');

window.addEventListener('DOMContentLoaded', () => {
  // elements
  const status = document.getElementById('status');
  const notesSaved = document.getElementById('notesSaved');

  const authSection = document.getElementById('authSection');
  const notesSection = document.getElementById('notesSection');
  const viewSection = document.getElementById('viewSection');

  const masterPass = document.getElementById('masterPass');
  const createBtn = document.getElementById('createBtn');
  const unlockPass = document.getElementById('unlockPass');
  const unlockBtn = document.getElementById('unlockBtn');

  const notesInput = document.getElementById('notes');
  const saveBtn = document.getElementById('saveBtn');
  const viewNotesBtn = document.getElementById('viewNotesBtn');
  const lockBtn = document.getElementById('lockBtn');

  const noteList = document.getElementById('noteList');
  const addNoteBtn = document.getElementById('addNoteBtn');
  const lockBtn2 = document.getElementById('lockBtn2');

  let sessionKey = null;

  // helper UI toggles (safe, uses class "hidden")
  function showAuth() {
    authSection.classList.remove('hidden');
    notesSection.classList.add('hidden');
    viewSection.classList.add('hidden');
    status.textContent = '';
  }
  function showNotes() {
    authSection.classList.add('hidden');
    notesSection.classList.remove('hidden');
    viewSection.classList.add('hidden');
    notesInput.disabled = false;
    notesInput.readOnly = false;
    notesInput.style.pointerEvents = 'auto';
    notesInput.focus();
  }
  function showView() {
    authSection.classList.add('hidden');
    notesSection.classList.add('hidden');
    viewSection.classList.remove('hidden');
  }

  // initial state: if salt exists, show unlock area; otherwise show create
  if (fs.existsSync(SALT_FILE)) {
    // keep both fields visible, but set status text
    status.textContent = 'Master password exists — unlock to continue.';
    unlockPass.disabled = false;
  } else {
    status.textContent = 'No master password yet — create one.';
    unlockPass.disabled = true;
  }

  // CREATE master password
  createBtn.addEventListener('click', () => {
    try {
      const pw = masterPass.value.trim();
      if (!pw) { status.textContent = 'Enter a master password first.'; return; }
      if (fs.existsSync(SALT_FILE)) { status.textContent = 'Master password already exists. Use Unlock.'; return; }

      const ok = cryptoModule.createMasterPassword(pw);
      if (!ok) { status.textContent = 'Failed to create master password (check console).'; console.error('createMasterPassword returned false'); return; }

      // create initial notes file
      if (!fs.existsSync(NOTES_FILE)) fs.writeFileSync(NOTES_FILE, JSON.stringify([]), 'utf8');

      // enable unlock field
      unlockPass.disabled = false;
      status.textContent = '✅ Master password created — now unlock.';
      masterPass.value = '';
      unlockPass.focus();
    } catch (err) {
      console.error('Create error', err);
      status.textContent = 'Error creating master password — check console.';
    }
  });

  // UNLOCK
  unlockBtn.addEventListener('click', () => {
    try {
      const pw = unlockPass.value.trim();
      if (!pw) { status.textContent = 'Enter password to unlock.'; return; }
      if (!fs.existsSync(SALT_FILE)) { status.textContent = 'No master password exists. Create one.'; return; }

      const ok = cryptoModule.unlockMasterPassword(pw);
      if (!ok) { status.textContent = '❌ Incorrect password.'; return; }

      // derive session key for AES from password + salt file
      const salt = fs.readFileSync(SALT_FILE);
      sessionKey = nodeCrypto.scryptSync(pw, salt, 32);

      status.textContent = '🔓 Unlock successful!';
      unlockPass.value = '';
      showNotes();
    } catch (err) {
      console.error('Unlock error', err);
      status.textContent = 'Unlock failed — check console.';
    }
  });

  // SAVE note
  saveBtn.addEventListener('click', () => {
    if (!sessionKey) { status.textContent = 'Unlock first.'; return; }
    const text = notesInput.value.trim();
    if (!text) { notesSaved.textContent = 'Note is empty.'; return; }

    try {
      const { data, iv, tag } = cryptoModule.encrypt(text, sessionKey);
      const arr = fs.existsSync(NOTES_FILE) ? JSON.parse(fs.readFileSync(NOTES_FILE, 'utf8')) : [];
      arr.push({ data, iv, tag });
      fs.writeFileSync(NOTES_FILE, JSON.stringify(arr, null, 2), 'utf8');
      notesInput.value = '';
      notesSaved.textContent = '🔒 Note saved securely!';
      setTimeout(()=> notesSaved.textContent = '', 1500);
    } catch (err) {
      console.error('Save note error', err);
      notesSaved.textContent = 'Failed to save note.';
    }
  });

  // VIEW notes
  viewNotesBtn.addEventListener('click', () => {
    if (!sessionKey) { status.textContent = 'Unlock first.'; return; }
    showView();
    if (!fs.existsSync(NOTES_FILE)) { noteList.innerHTML = '<p class="muted">No notes saved.</p>'; return; }
    try {
      const arr = JSON.parse(fs.readFileSync(NOTES_FILE, 'utf8'));
      if (!arr.length) { noteList.innerHTML = '<p class="muted">No notes saved.</p>'; return; }
      noteList.innerHTML = arr.map((n,i) => {
        try {
          const t = cryptoModule.decrypt(n.data, n.iv, n.tag, sessionKey);
          return `<div class="noteItem"><strong>Note ${i+1}:</strong><div>${escapeHtml(t)}</div></div>`;
        } catch (e) {
          return `<div class="noteItem">⚠️ Unable to decrypt note ${i+1}</div>`;
        }
      }).join('');
    } catch (err) {
      console.error('View notes read error', err);
      noteList.innerHTML = '<p>Failed to read notes.</p>';
    }
  });

  // Add new note from view
  addNoteBtn.addEventListener('click', () => {
    showNotes();
  });

  // Lock buttons - return to auth screen, clear session key
  lockBtn.addEventListener('click', () => { sessionKey = null; showAuth(); });
  lockBtn2.addEventListener('click', () => { sessionKey = null; showAuth(); });

  // small helper to avoid XSS in UI when showing note contents
  function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  }
});
