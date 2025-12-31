import { DatabaseConnection } from '../types';

// Use require instead of dynamic import to avoid initialization issues in CommonJS
const getMysql = () => require('mysql2/promise');
const getPg = () => require('pg');
const getMongodb = () => require('mongodb');

export const fetchDatabases = async (config: Omit<DatabaseConnection, 'id' | 'createdAt'>): Promise<{ success: boolean; databases: string[]; message?: string }> => {
    try {
        if (config.type === 'mysql') {
            const mysql = getMysql();
            const connection = await mysql.createConnection({
                host: config.host,
                port: config.port,
                user: config.username,
                password: config.password,
                connectTimeout: 5000,
            });
            const [rows] = await connection.query('SHOW DATABASES');
            await connection.end();
            const databases = (rows as any[])
                .map((row: any) => row.Database)
                .filter((db: string) => !['information_schema', 'performance_schema', 'mysql', 'sys'].includes(db));
            return { success: true, databases };
        } else if (config.type === 'postgres') {
            const { Client } = getPg();
            const client = new Client({
                host: config.host,
                port: config.port,
                user: config.username,
                password: config.password,
                database: 'postgres', // Connect to default database to list others
                connectionTimeoutMillis: 5000,
            });
            await client.connect();
            const result = await client.query(
                "SELECT datname FROM pg_database WHERE datistemplate = false AND datname NOT IN ('postgres')"
            );
            await client.end();
            const databases = result.rows.map((row: any) => row.datname);
            return { success: true, databases };
        } else if (config.type === 'mongodb') {
            const { MongoClient } = getMongodb();
            const auth = config.username ? `${encodeURIComponent(config.username)}:${encodeURIComponent(config.password || '')}@` : '';
            const uri = `mongodb://${auth}${config.host}:${config.port}`;
            const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
            await client.connect();
            const adminDb = client.db().admin();
            const result = await adminDb.listDatabases();
            await client.close();
            const databases = result.databases
                .map((db: any) => db.name)
                .filter((name: string) => !['admin', 'local', 'config'].includes(name));
            return { success: true, databases };
        }
        return { success: false, databases: [], message: 'Unsupported database type.' };
    } catch (error: any) {
        let errorMessage = 'Failed to fetch databases: ';
        if (error.code === 'ECONNREFUSED') {
            errorMessage += `Cannot reach database server at ${config.host}:${config.port}.`;
        } else if (error.code === 'ER_ACCESS_DENIED_ERROR' || error.message?.includes('authentication failed')) {
            errorMessage += `Authentication failed.`;
        } else if (error.message) {
            errorMessage += error.message;
        } else {
            errorMessage += 'Unknown error occurred.';
        }
        return { success: false, databases: [], message: errorMessage };
    }
};

export const testConnection = async (config: Omit<DatabaseConnection, 'id' | 'createdAt'>): Promise<{ success: boolean; message: string }> => {
    try {
        if (config.type === 'mysql') {
            const mysql = getMysql();
            const connection = await mysql.createConnection({
                host: config.host,
                port: config.port,
                user: config.username,
                password: config.password,
                connectTimeout: 5000,
            });
            await connection.end();
            return { success: true, message: 'Successfully connected to MySQL server.' };
        } else if (config.type === 'postgres') {
            const { Client } = getPg();
            const client = new Client({
                host: config.host,
                port: config.port,
                user: config.username,
                password: config.password,
                database: 'postgres', // Connect to default database
                connectionTimeoutMillis: 5000,
            });
            await client.connect();
            await client.end();
            return { success: true, message: 'Successfully connected to PostgreSQL server.' };
        } else if (config.type === 'mongodb') {
            const { MongoClient } = getMongodb();
            const auth = config.username ? `${encodeURIComponent(config.username)}:${encodeURIComponent(config.password || '')}@` : '';
            const uri = `mongodb://${auth}${config.host}:${config.port}`;
            const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
            await client.connect();
            await client.close();
            return { success: true, message: 'Successfully connected to MongoDB server.' };
        }
        return { success: false, message: 'Unsupported database type.' };
    } catch (error: any) {
        // Enhanced error messages with specific reasons
        let errorMessage = 'Connection failed: ';

        if (error.code === 'ECONNREFUSED') {
            errorMessage += `Cannot reach database server at ${config.host}:${config.port}. Please check if the server is running.`;
        } else if (error.code === 'ENOTFOUND') {
            errorMessage += `Host "${config.host}" not found. Please verify the hostname.`;
        } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNTIMEDOUT') {
            errorMessage += `Connection timed out. The server may be unreachable or too slow to respond.`;
        } else if (error.code === 'ER_ACCESS_DENIED_ERROR' || error.message?.includes('authentication failed')) {
            errorMessage += `Authentication failed. Please check your username and password.`;
        } else if (error.message) {
            errorMessage += error.message;
        } else {
            errorMessage += 'Unknown error occurred.';
        }

        return { success: false, message: errorMessage };
    }
};
