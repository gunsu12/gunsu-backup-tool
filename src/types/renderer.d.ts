import { DatabaseConnection, BackupSchedule } from './index';

export interface IElectronAPI {
    connections: {
        getAll: () => Promise<DatabaseConnection[]>;
        add: (connection: Omit<DatabaseConnection, 'id' | 'createdAt'>) => Promise<DatabaseConnection>;
        update: (connection: DatabaseConnection) => Promise<DatabaseConnection>;
        delete: (id: string) => Promise<boolean>;
        test: (connection: Omit<DatabaseConnection, 'id' | 'createdAt'>) => Promise<{ success: boolean; message: string }>;
        fetchDatabases: (connectionId: string) => Promise<{ success: boolean; databases: string[]; message?: string }>;
    };
    schedules: {
        getAll: () => Promise<BackupSchedule[]>;
        add: (schedule: Omit<BackupSchedule, 'id' | 'createdAt'>) => Promise<BackupSchedule>;
        update: (schedule: BackupSchedule) => Promise<BackupSchedule>;
        delete: (id: string) => Promise<boolean>;
        run: (schedule: BackupSchedule) => Promise<{ success: boolean; error?: string }>;
    };
    history: {
        getAll: () => Promise<any[]>;
        clear: () => Promise<boolean>;
    };
    settings: {
        getTheme: () => Promise<'light' | 'dark'>;
        setTheme: (theme: 'light' | 'dark') => Promise<void>;
    };
    selectFolder: () => Promise<string | null>;
    openFolder: (path: string) => Promise<void>;
    restoreBackup: (filePath: string, targetConnection: DatabaseConnection, database: string) => Promise<{ success: boolean; error?: string }>;
}

declare global {
    interface Window {
        api: IElectronAPI;
    }
}
