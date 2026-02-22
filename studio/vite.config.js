import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: { '@': path.resolve(__dirname, 'src') },
    },
    root: '.',
    build: {
        outDir: 'dist',
        sourcemap: true,
    },
    server: {
        port: 5173,
        strictPort: false,
        // 开发时前端 5173，后端 3000；/api 代理到后端，避免返回 index.html
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:3000',
                changeOrigin: true,
                configure: function (proxy) {
                    proxy.on('error', function (_err, _req, res) {
                        if (res && !res.headersSent) {
                            res.writeHead(502, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: '后端未就绪 (dev:server 未启动或未监听 3000)' }));
                        }
                    });
                },
            },
        },
    },
});
