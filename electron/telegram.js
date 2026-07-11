const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { ipcMain } = require('electron');
const dotenv = require('dotenv');

dotenv.config();

const apiId = parseInt(process.env.VITE_TELEGRAM_API_ID);
const apiHash = process.env.VITE_TELEGRAM_API_HASH;
let stringSession = new StringSession(process.env.VITE_TELEGRAM_SESSION || ''); // Or load from disk later

let client;
let phoneCodePromiseResolver = null;
let currentPhoneNumber = '';

async function initTelegram() {
  if (!client) {
    client = new TelegramClient(stringSession, apiId, apiHash, {
      connectionRetries: 5,
    });
    await client.connect();
  }
}

ipcMain.handle('telegram-check-auth', async () => {
  try {
    await initTelegram();
    return await client.checkAuthorization();
  } catch (err) {
    console.error('Check auth error:', err);
    return false;
  }
});

ipcMain.handle('telegram-send-code', async (event, phoneNumber) => {
  try {
    await initTelegram();
    currentPhoneNumber = phoneNumber;

    // Start the sign in process asynchronously so it doesn't block IPC
    client.start({
      phoneNumber: async () => currentPhoneNumber,
      password: async () => '', // Add 2FA handling here if needed
      phoneCode: async () => {
        return new Promise((resolve) => {
          phoneCodePromiseResolver = resolve;
        });
      },
      onError: (err) => {
        console.error('Telegram Error:', err);
      },
    }).then(() => {
      console.log('You are now connected and logged in.');
      // Save session
      console.log('Session string:', client.session.save());
      if (phoneCodePromiseResolver) {
        // We had to ask for code
        phoneCodePromiseResolver = null;
      }
    }).catch(err => {
      console.error('Telegram start error:', err);
    });

    // We return success immediately so the UI can prompt for code
    return { success: true };
  } catch (err) {
    console.error(err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('telegram-verify-code', async (event, code) => {
  try {
    if (phoneCodePromiseResolver) {
      phoneCodePromiseResolver(code);
      phoneCodePromiseResolver = null;
      return { success: true };
    } else {
      return { success: false, error: 'No code requested.' };
    }
  } catch (err) {
    console.error(err);
    return { success: false, error: err.message };
  }
});

module.exports = { initTelegram };
