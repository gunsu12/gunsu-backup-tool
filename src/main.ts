import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import store from './services/store.service';
import { DatabaseConnection, BackupSchedule } from './types/index';
import { testConnection } from './services/db.service';
import { initializeScheduler, registerSchedule, cancelSchedule } from './services/scheduler.service';
import { performBackup } from './services/backup.service';
import { randomUUID } from 'node:crypto';

// Global references to prevent garbage collection
let tray: Tray | null = null;
let mainWindow: BrowserWindow | null = null;
let isQuitting = false;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

// Set auto-launch
app.setLoginItemSettings({
  openAtLogin: true,
  path: app.getPath('exe'),
});

// Tray logic
const createTray = () => {
  // In dev, the icon is in src/assets
  // In build, we need to handle it differently, but for now let's fix dev
  const iconPath = path.join(process.cwd(), 'src/assets/icon.png');
  console.log('Loading tray icon from:', iconPath);

  const icon = nativeImage.createFromPath(iconPath);

  if (icon.isEmpty()) {
    console.error('Failed to load tray icon at:', iconPath);
    // Fallback to a plain color if image fails
    tray = new Tray(nativeImage.createFromNamedImage('NSActionTemplate'));
  } else {
    tray = new Tray(icon.resize({ width: 16, height: 16 }));
  }

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Dashboard',
      click: () => {
        mainWindow?.show();
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    },
  ]);

  tray.setToolTip('DB Backup Tool');
  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    mainWindow?.show();
  });
};

// Register IPC handlers
ipcMain.handle('get-connections', () => {
  return store.get('connections');
});

ipcMain.handle('add-connection', (_, connection: Omit<DatabaseConnection, 'id' | 'createdAt'>) => {
  const newConnection = { ...connection, id: randomUUID(), createdAt: Date.now() };
  const connections = store.get('connections');
  store.set('connections', [...connections, newConnection]);
  return newConnection;
});

ipcMain.handle('update-connection', (_, connection: DatabaseConnection) => {
  const connections = store.get('connections');
  const updatedConnections = connections.map((c: DatabaseConnection) =>
    c.id === connection.id ? connection : c
  );
  store.set('connections', updatedConnections);
  return connection;
});

ipcMain.handle('test-connection', async (_, connection: Omit<DatabaseConnection, 'id' | 'createdAt'>) => {
  return await testConnection(connection);
});

ipcMain.handle('delete-connection', (_, id: string) => {
  const connections = store.get('connections');
  store.set('connections', connections.filter((c: DatabaseConnection) => c.id !== id));
  return true;
});

// Schedule handlers
ipcMain.handle('get-schedules', () => {
  return store.get('schedules');
});

ipcMain.handle('add-schedule', (_, schedule: Omit<BackupSchedule, 'id' | 'createdAt'>) => {
  const newSchedule = { ...schedule, id: randomUUID(), createdAt: Date.now() };
  const schedules = store.get('schedules');
  store.set('schedules', [...schedules, newSchedule]);

  // Register the schedule if enabled
  if (newSchedule.enabled) {
    registerSchedule(newSchedule);
  }

  return newSchedule;
});

ipcMain.handle('update-schedule', (_, schedule: BackupSchedule) => {
  const schedules = store.get('schedules');
  const updatedSchedules = schedules.map((s: BackupSchedule) =>
    s.id === schedule.id ? schedule : s
  );
  store.set('schedules', updatedSchedules);

  // Re-register or cancel the schedule based on enabled status
  if (schedule.enabled) {
    registerSchedule(schedule);
  } else {
    cancelSchedule(schedule.id);
  }

  return schedule;
});

ipcMain.handle('delete-schedule', (_, id: string) => {
  const schedules = store.get('schedules');
  store.set('schedules', schedules.filter((s: BackupSchedule) => s.id !== id));

  // Cancel the active job
  cancelSchedule(id);

  return true;
});

ipcMain.handle('run-backup', async (_, schedule: BackupSchedule) => {
  try {
    await performBackup(schedule);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// History handlers
ipcMain.handle('get-history', () => {
  return store.get('history') || [];
});

ipcMain.handle('clear-history', () => {
  store.set('history', []);
  return true;
});

// File system handlers
ipcMain.handle('select-folder', async () => {
  const { dialog } = await import('electron');
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('open-folder', async (_, folderPath: string) => {
  const { shell } = await import('electron');
  await shell.openPath(folderPath);
});

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  // Handle window close
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
    return false;
  });

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  initializeScheduler();
  createWindow();
  createTray();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (isQuitting) {
      app.quit();
    }
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  } else {
    mainWindow?.show();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
