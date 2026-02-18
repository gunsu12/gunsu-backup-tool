import { BackupSchedule, DatabaseConnection } from '../types';
import store from './store.service';
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs/promises';
import { createWriteStream, createReadStream, existsSync } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { createGzip } from 'node:zlib';
import mysqldump from 'mysqldump';

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
    const filename = `${schedule.database}_${timestamp}.sql`;
    const backupFile = path.join(schedule.backupPath, filename);

    console.log(`Backing up to: ${backupFile}`);

    try {
        let finalBackupPath = backupFile;

        if (connection.type === 'mysql') {
            await backupMySQL(connection, schedule.database, backupFile);
        } else if (connection.type === 'postgres') {
            await backupPostgreSQL(connection, schedule.database, backupFile);
        } else if (connection.type === 'mongodb') {
            const mongodbDir = path.join(schedule.backupPath, `mongodb_${timestamp}`);
            await backupMongoDB(connection, schedule.database, schedule.backupPath, timestamp);
            finalBackupPath = mongodbDir;
        } else {
            throw new Error(`Unsupported database type: ${connection.type}`);
        }

        // Handle compression - use streaming for large files
        if (schedule.compress) {
            console.log(`Compressing backup: ${finalBackupPath}`);

            const stats = await fs.stat(finalBackupPath);

            if (stats.isDirectory()) {
                // For directories (MongoDB), use archiver with streaming
                const archiver = require('archiver');
                const zipFilename = `mongodb_${timestamp}.zip`;
                const zipPath = path.join(schedule.backupPath, zipFilename);

                await new Promise<void>((resolve, reject) => {
                    const output = createWriteStream(zipPath);
                    const archive = archiver('zip', { zlib: { level: 6 } });

                    output.on('close', () => resolve());
                    archive.on('error', reject);

                    archive.pipe(output);
                    archive.directory(finalBackupPath, false);
                    archive.finalize();
                });

                // Delete original folder after compression
                await fs.rm(finalBackupPath, { recursive: true, force: true });
                finalBackupPath = zipPath;
            } else {
                // For single files, use gzip streaming (more efficient for large files)
                const gzipPath = finalBackupPath + '.gz';

                await pipeline(
                    createReadStream(finalBackupPath),
                    createGzip(),
                    createWriteStream(gzipPath)
                );

                // Delete original file after compression
                await fs.unlink(finalBackupPath);
                finalBackupPath = gzipPath;
            }

            console.log(`Compression completed: ${finalBackupPath}`);
        }

        // Save to history
        const history = store.get('history') || [];
        store.set('history', [{
            id: `${Date.now()}-${Math.random()}`,
            scheduleId: schedule.id,
            connectionId: connection.id,
            backupFile: finalBackupPath,
            timestamp: Date.now(),
            status: 'success',
            size: 0 // TODO: Get actual file size
        }, ...history]);

        console.log(`Backup completed successfully: ${finalBackupPath}`);
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

const backupMySQL = async (connection: DatabaseConnection, database: string, backupFile: string): Promise<void> => {

    // Check if bin path is provided and might contain mysqldump
    // The library can use a local binary if configured, but here we'll let it handle things
    // or we could point it to the bundled binary if we wanted to enforce that.
    // For now, let's stick to the library's default behavior which is pure JS or system binary.

    try {
        await mysqldump({
            connection: {
                host: connection.host,
                user: connection.username,
                password: connection.password || '',
                database: database,
                port: connection.port,
            },
            dumpToFile: backupFile,
            compressFile: false, // We handle compression separately
        });
        console.log(`MySQL backup created successfully at ${backupFile}`);
    } catch (err: any) {
        console.error('MySQL backup via library failed:', err);
        throw new Error(`MySQL Backup failed: ${err.message}`);
    }
};

const getBinaryPath = (binName: string, connectionPath?: string): string => {
    // 1. If user provided a path, use it
    if (connectionPath) {
        return path.join(connectionPath, binName);
    }

    const isWin = process.platform === 'win32';
    const binFile = binName + (isWin ? '.exe' : '');
    const cwd = process.cwd();

    // Check possible locations:
    // 1. Dev: ./bin/pg_dump.exe
    // 2. Prod (packaged): ./resources/bin/pg_dump.exe
    // 3. Fallback: just bin/pg_dump.exe relative to CWD

    const possiblePaths = [
        path.join(cwd, 'resources', 'bin', binFile), // Production
        path.join(cwd, 'bin', binFile),              // Development
        // Also check one level up if we are inside app.asar (though resources should be outside)
        path.join(path.dirname(cwd), 'resources', 'bin', binFile),
    ];

    for (const p of possiblePaths) {
        if (existsSync(p)) {
            console.log(`Found binary at: ${p}`);
            return p;
        }
    }

    // Default to the most likely prod path if not found, to show useful error
    console.warn(`Binary ${binName} not found in expected locations. Defaulting to standard resource path.`);
    return path.join(cwd, 'resources', 'bin', binFile);
};

const backupPostgreSQL = async (connection: DatabaseConnection, database: string, backupFile: string): Promise<void> => {
    const bin = getBinaryPath('pg_dump', connection.binPath);

    return new Promise((resolve, reject) => {
        const args = [
            `-h`, connection.host,
            `-p`, connection.port.toString(),
            `-U`, connection.username,
            `-d`, database,
            `-f`, backupFile
        ];

        const env = {
            ...process.env,
            PGPASSWORD: connection.password || ''
        };

        const pgDumpProcess = spawn(bin, args, {
            env,
            stdio: ['ignore', 'pipe', 'pipe']
        });

        let stderrData = '';
        pgDumpProcess.stderr.on('data', (data) => {
            stderrData += data.toString();
        });

        pgDumpProcess.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`pg_dump failed with code ${code}: ${stderrData}`));
            }
        });

        pgDumpProcess.on('error', (err) => {
            reject(new Error(`pg_dump error: ${err.message}`));
        });
    });
};

const backupMongoDB = async (connection: DatabaseConnection, database: string, backupPath: string, timestamp: string): Promise<void> => {
    const outputDir = path.join(backupPath, `mongodb_${timestamp}`);
    const bin = getBinaryPath('mongodump', connection.binPath);

    return new Promise((resolve, reject) => {
        const args = [
            `--host`, `${connection.host}:${connection.port}`,
            `--db`, database,
            `--out`, outputDir
        ];

        // Add auth if provided
        if (connection.username) {
            args.push(`-u`, connection.username);
            if (connection.password) {
                args.push(`-p`, connection.password);
            }
        }

        const mongodumpProcess = spawn(bin, args, {
            stdio: ['ignore', 'pipe', 'pipe']
        });

        let stderrData = '';
        mongodumpProcess.stderr.on('data', (data) => {
            stderrData += data.toString();
        });

        mongodumpProcess.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`mongodump failed with code ${code}: ${stderrData}`));
            }
        });

        mongodumpProcess.on('error', (err) => {
            reject(new Error(`mongodump error: ${err.message}`));
        });
    });
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
                    // Check if it's a backup file (ends with .sql, .zip or is a mongodb backup directory)
                    if (file.endsWith('.sql') || file.endsWith('.zip') || file.startsWith('mongodb_')) {
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
