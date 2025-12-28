import { DatabaseConnection } from '../types';

// Use require instead of dynamic import to avoid initialization issues in CommonJS
const getMysql = () => require('mysql2/promise');
const getPg = () => require('pg');
const getMongodb = () => require('mongodb');

export const testConnection = async (config: Omit<DatabaseConnection, 'id' | 'createdAt'>): Promise<{ success: boolean; message: string }> => {
    try {
        if (config.type === 'mysql') {
            const mysql = getMysql();
            const connection = await mysql.createConnection({
                host: config.host,
                port: config.port,
                user: config.username,
                password: config.password,
                database: config.database,
                connectTimeout: 5000,
            });
            await connection.end();
            return { success: true, message: 'Successfully connected to MySQL database.' };
        } else if (config.type === 'postgres') {
            const { Client } = getPg();
            const client = new Client({
                host: config.host,
                port: config.port,
                user: config.username,
                password: config.password,
                database: config.database,
                connectionTimeoutMillis: 5000,
            });
            await client.connect();
            await client.end();
            return { success: true, message: 'Successfully connected to PostgreSQL database.' };
        } else if (config.type === 'mongodb') {
            const { MongoClient } = getMongodb();
            const auth = config.username ? `${encodeURIComponent(config.username)}:${encodeURIComponent(config.password || '')}@` : '';
            const uri = `mongodb://${auth}${config.host}:${config.port}/${config.database}`;
            const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
            await client.connect();
            await client.close();
            return { success: true, message: 'Successfully connected to MongoDB.' };
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
        } else if (error.code === 'ER_BAD_DB_ERROR' || error.message?.includes('database') && error.message?.includes('does not exist')) {
            errorMessage += `Database "${config.database}" does not exist on the server.`;
        } else if (error.message) {
            errorMessage += error.message;
        } else {
            errorMessage += 'Unknown error occurred.';
        }

        return { success: false, message: errorMessage };
    }
};
