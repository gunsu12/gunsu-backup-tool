
import { DatabaseConnection } from '../types';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';

const execAsync = promisify(exec);

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

    // Handle ZIP files
    if (filePath.endsWith('.zip')) {
        console.log('Detected ZIP archive, extracting...');
        const AdmZip = require('adm-zip');
        const zip = new AdmZip(filePath);

        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'db-restore-'));
        zip.extractAllTo(tempDir, true);

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
                const mongoDir = validFiles.find(f => f.startsWith('mongodb_') || !path.extname(f)); // Folder often has no extension
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
    const env = {
        ...process.env,
        PGPASSWORD: connection.password || ''
    };

    const bin = getBinaryPath('psql', connection.binPath);
    // psql -h host -p port -U user -d db -f file.sql
    const command = `"${bin}" -h ${connection.host} -p ${connection.port} -U ${connection.username} -d ${database} -f "${backupFile}"`;

    await execAsync(command, { env });
};

const restoreMongoDB = async (connection: DatabaseConnection, database: string, backupPath: string): Promise<void> => {
    // mongorestore --host ... --db ... <directory_or_file>
    const auth = connection.username ? `-u ${connection.username} -p ${connection.password}` : '';
    const bin = getBinaryPath('mongorestore', connection.binPath);

    // If backupPath is a directory (from ZIP buffer or specific folder), pass it directly or use --dir
    // mongorestore can take the path as argument.

    // Check if backupPath is a file (archive) or directory
    const stat = await fs.stat(backupPath);
    let args = '';

    if (stat.isDirectory()) {
        // If it's a BSON dump directory
        args = `"${backupPath}"`;
    } else {
        // If it's an archive file (if we supported mongodump --archive) or single BSON?
        // Our backup service creates a directory `mongodb_...` so we expect a directory.
        // But if user zipped it, we unzipped it.
        // If the unzipped path is a directory containing the dump, good.
        // If it is a file?

        args = `"${backupPath}"`;
        // Use --archive if it is a single file?
        // Current backup impl for mongo uses --out dir, so result is dir.
        // So restore should point to that dir.
    }

    const command = `"${bin}" --host ${connection.host}:${connection.port} ${auth} --db ${database} --drop ${args}`;
    // Added --drop to ensure clean state before restore (optional but recommended for full restore)

    await execAsync(command);
};
