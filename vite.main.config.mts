import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
    build: {
        rollupOptions: {
            external: [
                'mysql2',
                'pg',
                'mongodb',
                'mysqldump',
                'mysql-import',
                'node-schedule',
            ],
        },
    },
});
