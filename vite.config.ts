import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves the site from https://<user>.github.io/<repo>/,
  // so this must match the repository name exactly.
  base: '/drivetracker/',
  plugins: [react()],
})
