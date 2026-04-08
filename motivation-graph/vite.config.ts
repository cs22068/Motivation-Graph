import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/motivation-graph/', // ←この1行を追加（最後にカンマが必要です）
})