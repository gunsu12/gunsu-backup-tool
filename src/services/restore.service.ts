
import { DatabaseConnection } from '../types';
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import os from 'node:os';
import { createGunzip } from 'node:zlib';
import { pipeline } from 'node:stream/promises';

const getBinaryPath = (binName: string, connectionPath?: string): string => {
    // 1. If user provided a path, use it
    if (connectionPath) {
        return path.join(connectionPath, binName);
    }

    // 2. Check bundled bin folder
    const bundledPath = path.join(process.cwd(), 'bin', binName + (process.platform === 'win32' ? '.exe' : ''));
    return bundledPath;
};

export const restoreBackup = async (filePath: string, connection: DatabaseConnection, database: string): Promise<void> => {
    console.log(`Starting restore for ${database} from ${filePath}`);

    // Check if file exists
    try {
        await fs.access(filePath);
    } catch {
        throw new Error(`Backup file not found: ${filePath}`);
    }

    let targetFile = filePath;
    let tempDir = '';

    // Handle gzip files (.sql.gz)
    if (filePath.endsWith('.gz')) {
        console.log('Detected gzip archive, extracting...');
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'db-restore-'));
        
        // Remove .gz extension for the output file
        const outputName = path.basename(filePath).slice(0, -3);
        targetFile = path.join(tempDir, outputName);
        
        // Use streaming to extract gzip
        await pipeline(
            createReadStream(filePath),
            createGunzip(),
            createWriteStream(targetFile)
        );
        
        console.log(`Extracted to ${targetFile}`);
    }
    // Handle ZIP files
    else if (filePath.endsWith('.zip')) {
        console.log('Detected ZIP archive, extracting...');
        const unzipper = require('unzipper');

        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'db-restore-'));
        
        // Use streaming extraction
        await new Promise<void>((resolve, reject) => {
            createReadStream(filePath)
                .pipe(unzipper.Extract({ path: tempDir }))
                .on('close', resolve)
                .on('error', reject);
        });

        // Find the actual backup file/folder
        const files = await fs.readdir(tempDir);
        const validFiles = files.filter(f => !f.startsWith('.') && f !== '__MACOSX');

        if (validFiles.length === 0) {
            throw new Error('Empty ZIP archive (no valid files found)');
        }

        // Try to identify the backup file
        // 1. If only one file, use it
        if (validFiles.length === 1) {
            targetFile = path.join(tempDir, validFiles[0]);
        } else {
            // 2. Look for .sql file
            const sqlFile = validFiles.find(f => f.endsWith('.sql'));
            if (sqlFile) {
                targetFile = path.join(tempDir, sqlFile);
            } else {
                // 3. Look for mongodb folder
                const mongoDir = validFiles.find(f => f.startsWith('mongodb_') || !path.extname(f));
                if (mongoDir) {
                    targetFile = path.join(tempDir, mongoDir);
                } else {
                    // Fallback to first valid file
                    targetFile = path.join(tempDir, validFiles[0]);
                }
            }
        }

        console.log(`Extracted to ${targetFile}`);
    }

    try {
        if (connection.type === 'mysql') {
            await restoreMySQL(connection, database, targetFile);
        } else if (connection.type === 'postgres') {
            await restorePostgreSQL(connection, database, targetFile);
        } else if (connection.type === 'mongodb') {
            // For MongoDB, targetFile might be a directory if it was a folder dump
            await restoreMongoDB(connection, database, targetFile);
        } else {
            throw new Error(`Unsupported database type: ${connection.type}`);
        }
        console.log('Restore completed successfully');
    } finally {
        // Cleanup temp dir if created
        if (tempDir) {
            try {
                await fs.rm(tempDir, { recursive: true, force: true });
            } catch (e) {
                console.warn('Failed to cleanup temp directory:', e);
            }
        }
    }
};

const restoreMySQL = async (connection: DatabaseConnection, database: string, backupFile: string): Promise<void> => {
    // improved: pure Node.js implementation using mysql-import
    // This avoids dependency on mysql.exe being in the system PATH
    const Importer = require('mysql-import');

    // Importer expects host, user, password, database
    const importer = new Importer({
        host: connection.host,
        port: connection.port,
        user: connection.username,
        password: connection.password || '',
        database: database
    });

    try {
        await importer.import(backupFile);

        const filesImported = importer.getImported();
        console.log(`${filesImported.length} SQL file(s) imported.`);
    } catch (err) {
        throw new Error(`MySQL Import failed: ${err}`);
    }
};

const restorePostgreSQL = async (connection: DatabaseConnection, database: string, backupFile: string): Promise<void> => {
    const bin = getBinaryPath('psql', connection.binPath);
    
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

        const psqlProcess = spawn(bin, args, {
            env,
            stdio: ['ignore', 'pipe', 'pipe']
        });

        let stderrData = '';
        psqlProcess.stderr.on('data', (data) => {
            stderrData += data.toString();
        });

        psqlProcess.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`psql failed with code ${code}: ${stderrData}`));
            }
        });

        psqlProcess.on('error', (err) => {
            reject(new Error(`psql error: ${err.message}`));
        });
    });
};

const restoreMongoDB = async (connection: DatabaseConnection, database: string, backupPath: string): Promise<void> => {
    const bin = getBinaryPath('mongorestore', connection.binPath);
    
    return new Promise(async (resolve, reject) => {
        const args = [
            `--host`, `${connection.host}:${connection.port}`,
            `--db`, database,
            `--drop`
        ];

        // Add auth if provided
        if (connection.username) {
            args.push(`-u`, connection.username);
            if (connection.password) {
                args.push(`-p`, connection.password);
            }
        }

        // Add the backup path (directory or file)
        args.push(backupPath);

        const mongorestoreProcess = spawn(bin, args, {
            stdio: ['ignore', 'pipe', 'pipe']
        });

        let stderrData = '';
        mongorestoreProcess.stderr.on('data', (data) => {
            stderrData += data.toString();
        });

        mongorestoreProcess.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`mongorestore failed with code ${code}: ${stderrData}`));
            }
        });

        mongorestoreProcess.on('error', (err) => {
            reject(new Error(`mongorestore error: ${err.message}`));
        });
    });
};
