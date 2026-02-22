import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite' // 1. 导入插件

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),      // 2. 保留原有 React 插件
    tailwindcss(), // 3. 添加 Tailwind 插件
  ],
})
