import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ command }) => {
  // GitHub Pages serveert dit als project page onder /clubhuis/; lokaal blijft het root.
  const base = command === 'build' ? '/clubhuis/' : '/'

  return {
    base,
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        // Bewust 'prompt' en geen 'autoUpdate': een nieuwe versie mag de pagina nooit
        // zomaar herladen terwijl een kind een verhaal aan het typen is.
        registerType: 'prompt',
        injectRegister: null,
        includeAssets: ['favicon.svg'],
        manifest: {
          name: 'Clubhuis',
          short_name: 'Clubhuis',
          description: 'Een veilig herinneringenboek, geen feed.',
          theme_color: '#6D4FE0',
          background_color: '#F5F3FF',
          display: 'standalone',
          orientation: 'portrait',
          scope: base,
          start_url: base,
          icons: [
            { src: `${base}icons/icon-192.png`, sizes: '192x192', type: 'image/png' },
            { src: `${base}icons/icon-512.png`, sizes: '512x512', type: 'image/png' },
            {
              src: `${base}icons/icon-512-maskable.png`,
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        },
      }),
    ],
    server: {
      port: 5173,
    },
  }
})
