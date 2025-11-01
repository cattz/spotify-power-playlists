// Load environment variables from .env file
import { config } from 'dotenv';
config();

import { app, BrowserWindow } from 'electron';
import { join } from 'path';
import { setupIpcHandlers, initializeServices, getDatabase } from './ipc-handlers';

let mainWindow: BrowserWindow | null = null;

// Get Spotify Client ID from environment
const SPOTIFY_CLIENT_ID = process.env.VITE_SPOTIFY_CLIENT_ID;

if (!SPOTIFY_CLIENT_ID) {
  console.error('VITE_SPOTIFY_CLIENT_ID not found in environment variables');
  console.error('Please create a .env file with your Spotify Client ID');
  app.quit();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    backgroundColor: '#000000',
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    titleBarStyle: 'hiddenInset',
    show: false,
  });

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // In development, load from Vite dev server
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load from built files
    mainWindow.loadFile(join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(() => {
  // Initialize services
  if (SPOTIFY_CLIENT_ID) {
    initializeServices(SPOTIFY_CLIENT_ID);
  }

  // Set up IPC handlers
  setupIpcHandlers();

  // Create window
  createWindow();

  app.on('activate', () => {
    // On macOS, re-create window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // On macOS, apps stay active until explicitly quit
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle app quit
app.on('before-quit', () => {
  // Clean up resources
  const db = getDatabase();
  if (db) {
    db.close();
  }
});
