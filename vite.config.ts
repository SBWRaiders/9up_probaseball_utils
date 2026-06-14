import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import path from 'path' // ✅ 이거 추가해야 alias 작동함

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,         // 포트 번호를 5173으로 고정
    strictPort: true,   // 다른 포트로 자동 변경되는 것을 차단
  },
})
