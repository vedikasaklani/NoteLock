const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

const SALT_FILE = path.join(__dirname, 'salt.txt');

contextBridge.exposeInMainWorld('api', {
  saveSalt: (salt) => fs.writeFileSync(SALT_FILE, salt, 'utf8'),
  saltExists: () => fs.existsSync(SALT_FILE),
  readSalt: () => fs.readFileSync(SALT_FILE, 'utf8')
});
