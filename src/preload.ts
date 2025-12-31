import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
    connections: {
        getAll: () => ipcRenderer.invoke('get-connections'),
        add: (connection: any) => ipcRenderer.invoke('add-connection', connection),
        update: (connection: any) => ipcRenderer.invoke('update-connection', connection),
        delete: (id: string) => ipcRenderer.invoke('delete-connection', id),
        test: (connection: any) => ipcRenderer.invoke('test-connection', connection),
        fetchDatabases: (connectionId: string) => ipcRenderer.invoke('fetch-databases', connectionId),
    },
    schedules: {
        getAll: () => ipcRenderer.invoke('get-schedules'),
        add: (schedule: any) => ipcRenderer.invoke('add-schedule', schedule),
        update: (schedule: any) => ipcRenderer.invoke('update-schedule', schedule),
        delete: (id: string) => ipcRenderer.invoke('delete-schedule', id),
        run: (schedule: any) => ipcRenderer.invoke('run-backup', schedule),
    },
    history: {
        getAll: () => ipcRenderer.invoke('get-history'),
        clear: () => ipcRenderer.invoke('clear-history'),
    },
    settings: {
        getTheme: () => ipcRenderer.invoke('get-theme'),
        setTheme: (theme: string) => ipcRenderer.invoke('set-theme', theme),
    },
    selectFolder: () => ipcRenderer.invoke('select-folder'),
    openFolder: (path: string) => ipcRenderer.invoke('open-folder', path),
    restoreBackup: (filePath: string, targetConnection: any, targetDatabase: string) => ipcRenderer.invoke('restore-backup', filePath, targetConnection, targetDatabase),
});
