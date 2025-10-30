# NoteLock
An offline notes app that encrypts every note on-device
It only decrypts when the user enters a passphrase/ biometric, and shows tamper/evidence (HMAC) for each note. Suitable for sensitive information like passwords, bank details etc.

===============================PROJECT IN PROGRESS======================================

Features : 
  - Local-only storage (no cloud).
  - Create/read/edit/delete notes; each note encrypted with AES-GCM.
  - Master password → key derivation (Argon2id recommended; fallback to PBKDF2 in demo).
  - Per-note HMAC to detect tampering.
  - Export / Import encrypted backup (single file).
  - Simple UI: login screen, note list (titles only), note view/edit.
  - Demo script and short security checklist

BLUE- PRINT: 
1. Turn the user’s password into a very strong secret key using special math (Argon2id). That key will be used to lock and unlock all your notes safely.
Even if hackers get your files, they can’t open them without your password.
2. Each note should be encrypted separately using AES-GCM or XChaCha20-Poly1305.
Generate a new random nonce each time you encrypt a note.
Store the ciphertext , nonce, and some metadata
3. Store the master key securely by encrypting (“wrapping”) it with the system’s hardware-backed keystore
4. Store encrypted notes as blobs in a database — e.g., SQLCipher or encrypted SQLite.
5. Keep plaintext in memory only as long as needed, overwrite (zero out) memory once done, never print or log secrets.
