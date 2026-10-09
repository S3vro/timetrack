import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// base './' = relative asset paths, so it works under https://<user>.github.io/<any-repo-name>/
// (routing uses hash mode, so no server-side rewrites are needed)
export default defineConfig({
  base: './',
  plugins: [vue(), tailwindcss()],
})
