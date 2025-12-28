import { BackupSchedule, DatabaseConnection } from '../types';
import store from './store.service';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import fs from 'node:fs/promises';

const execAsync = promisify(exec);

export const performBackup = async (schedule: BackupSchedule): Promise<void> => {
    console.log(`Starting backup for schedule: ${schedule.name}`);

    // Get connection details
    const connections = store.get('connections') as DatabaseConnection[];
    const connection = connections.find(c => c.id === schedule.connectionId);

    if (!connection) {
        throw new Error(`Connection not found: ${schedule.connectionId}`);
    }

    // Ensure backup directory exists
    try {
        await fs.mkdir(schedule.backupPath, { recursive: true });
    } catch (error) {
        console.error('Failed to create backup directory:', error);
        throw error;
    }

    // Generate backup filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `${connection.database}_${timestamp}.sql`;
    const backupFile = path.join(schedule.backupPath, filename);

    console.log(`Backing up to: ${backupFile}`);

    try {
        if (connection.type === 'mysql') {
            await backupMySQL(connection, backupFile);
        } else if (connection.type === 'postgres') {
            await backupPostgreSQL(connection, backupFile);
        } else if (connection.type === 'mongodb') {
            await backupMongoDB(connection, schedule.backupPath, timestamp);
        } else {
            throw new Error(`Unsupported database type: ${connection.type}`);
        }

        // Save to history
        const history = store.get('history') || [];
        store.set('history', [{
            id: `${Date.now()}-${Math.random()}`,
            scheduleId: schedule.id,
            connectionId: connection.id,
            backupFile,
            timestamp: Date.now(),
            status: 'success',
            size: 0 // TODO: Get actual file size
        }, ...history]);

        console.log(`Backup completed successfully: ${backupFile}`);
    } catch (error) {
        console.error('Backup failed:', error);

        // Save failed backup to history
        const history = store.get('history') || [];
        store.set('history', [{
            id: `${Date.now()}-${Math.random()}`,
            scheduleId: schedule.id,
            connectionId: connection.id,
            backupFile,
            timestamp: Date.now(),
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error'
        }, ...history]);

        throw error;
    }
};

const backupMySQL = async (connection: DatabaseConnection, backupFile: string): Promise<void> => {
    const mysqldump = require('mysqldump');

    await mysqldump({
        connection: {
            host: connection.host,
            user: connection.username,
            password: connection.password || '',
            database: connection.database,
            port: connection.port,
        },
        dumpToFile: backupFile,
    });
};

const getBinaryPath = (binName: string, connectionPath?: string): string => {
    // 1. If user provided a path, use it
    if (connectionPath) {
        return path.join(connectionPath, binName);
    }

    // 2. Check bundled bin folder (works in both dev and production)
    // In production, binaries are usually in the 'resources/bin' or 'bin' folder
    const bundledPath = path.join(process.cwd(), 'bin', binName + (process.platform === 'win32' ? '.exe' : ''));

    // Simple check if bundled binary exists would be good, but for now we'll prioritize it
    return bundledPath;
};

const backupPostgreSQL = async (connection: DatabaseConnection, backupFile: string): Promise<void> => {
    const env = {
        ...process.env,
        PGPASSWORD: connection.password || ''
    };

    const bin = getBinaryPath('pg_dump', connection.binPath);
    const command = `"${bin}" -h ${connection.host} -p ${connection.port} -U ${connection.username} -d ${connection.database} -f "${backupFile}"`;

    await execAsync(command, { env });
};

const backupMongoDB = async (connection: DatabaseConnection, backupPath: string, timestamp: string): Promise<void> => {
    const auth = connection.username ? `-u ${connection.username} -p ${connection.password}` : '';
    const outputDir = path.join(backupPath, `mongodb_${timestamp}`);

    const bin = getBinaryPath('mongodump', connection.binPath);
    const command = `"${bin}" --host ${connection.host}:${connection.port} ${auth} --db ${connection.database} --out "${outputDir}"`;

    await execAsync(command);
};

export const cleanupOldBackups = async (schedule: BackupSchedule): Promise<void> => {
    if (schedule.retentionDays <= 0) {
        return; // Keep forever
    }

    console.log(`Cleaning up backups older than ${schedule.retentionDays} days for schedule: ${schedule.name}`);

    try {
        const files = await fs.readdir(schedule.backupPath);
        const now = Date.now();
        const retentionMs = schedule.retentionDays * 24 * 60 * 60 * 1000;

        let deletedCount = 0;

        for (const file of files) {
            const filePath = path.join(schedule.backupPath, file);

            try {
                const stats = await fs.stat(filePath);
                const fileAge = now - stats.mtimeMs;

                if (fileAge > retentionMs) {
                    // Check if it's a backup file (ends with .sql or is a mongodb backup directory)
                    if (file.endsWith('.sql') || file.startsWith('mongodb_')) {
                        if (stats.isDirectory()) {
                            await fs.rm(filePath, { recursive: true, force: true });
                        } else {
                            await fs.unlink(filePath);
                        }
                        deletedCount++;
                        console.log(`Deleted old backup: ${file} (${Math.floor(fileAge / (24 * 60 * 60 * 1000))} days old)`);
                    }
                }
            } catch (error) {
                console.error(`Failed to process file ${file}:`, error);
            }
        }

        if (deletedCount > 0) {
            console.log(`Cleanup completed: Deleted ${deletedCount} old backup(s)`);
        } else {
            console.log('No old backups to delete');
        }
    } catch (error) {
        console.error('Cleanup failed:', error);
    }
};
