const crypto = require('crypto');
const fs = require('fs');

const KEY_PATH = 'key.enc';
const SALT_PATH = 'salt.enc';

// --- Create Master Password ---
function createMasterPassword(password) {
  try {
    const salt = crypto.randomBytes(16);
    const key = crypto.scryptSync(password, salt, 32);
    const hash = crypto.createHash('sha256').update(key).digest('hex');

    fs.writeFileSync(SALT_PATH, salt);
    fs.writeFileSync(KEY_PATH, hash);
    return true;
  } catch (err) {
    console.error('Error creating master password:', err);
    return false;
  }
}

// --- Unlock Master Password ---
function unlockMasterPassword(password) {
  try {
    if (!fs.existsSync(KEY_PATH) || !fs.existsSync(SALT_PATH)) return false;

    const salt = fs.readFileSync(SALT_PATH);
    const storedHash = fs.readFileSync(KEY_PATH, 'utf8').trim();

    const derivedKey = crypto.scryptSync(password, salt, 32);
    const derivedHash = crypto.createHash('sha256').update(derivedKey).digest('hex');

    return storedHash === derivedHash;
  } catch (err) {
    console.error('Unlock failed:', err);
    return false;
  }
}

// --- Encrypt / Decrypt Notes ---
function encrypt(text, key) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const tag = cipher.getAuthTag();
  return { data: encrypted, iv: iv.toString('base64'), tag: tag.toString('base64') };
}

function decrypt(encrypted, iv, tag, key) {
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(iv, 'base64')
  );
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  let decrypted = decipher.update(encrypted, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

module.exports = { createMasterPassword, unlockMasterPassword, encrypt, decrypt };
