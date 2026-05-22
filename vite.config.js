import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
var __dirname = path.dirname(fileURLToPath(import.meta.url));
// https://vitejs.dev/config/
export default defineConfig(function (_a) {
    var mode = _a.mode;
    var env = loadEnv(mode, process.cwd(), '');
    var apiPort = env.PORT || '3001';
    var devApiTarget = env.VITE_DEV_API_TARGET || "http://localhost:".concat(apiPort);
    return {
        plugins: [react()],
        server: {
            proxy: {
                '/api': {
                    target: devApiTarget,
                    changeOrigin: true,
                },
            },
        },
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src'),
            },
        },
    };
});
