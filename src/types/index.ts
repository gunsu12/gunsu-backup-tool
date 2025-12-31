export interface DatabaseConnection {
    id: string;
    name: string;
    type: 'mysql' | 'postgres' | 'mongodb';
    host: string;
    port: number;
    username: string;
    password?: string;
    binPath?: string; // Path to dump tools (e.g. C:\Program Files\PostgreSQL\16\bin)
    createdAt: number;
}

export interface BackupSchedule {
    id: string;
    connectionId: string;
    database: string; // Database to backup
    name: string;
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string; // HH:mm format (for weekly/monthly)
    times?: string[]; // Multiple times for daily frequency
    dayOfWeek?: number; // 0-6 for weekly
    dayOfMonth?: number; // 1-31 for monthly
    backupPath: string;
    enabled: boolean;
    retentionDays: number; // How many days to keep backups (0 = keep forever)
    compress: boolean;
    createdAt: number;
}
