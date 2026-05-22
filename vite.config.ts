import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '')
    const apiPort = env.PORT || '3001'
    const devApiTarget = env.VITE_DEV_API_TARGET || `http://localhost:${apiPort}`

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
    }
})
