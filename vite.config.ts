import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(() => {
  // Draait op het eigen domein (clubhuis.eu) vanaf de hoofdmap, dus geen sub-path meer nodig.
  const base = '/'

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
          description: 'Een veilig herinneringenboek, geen eindeloze feed.',
          theme_color: '#3F739F',
          background_color: '#F7F4EF',
          // 'minimal-ui' gaf op Android de volledige fotokiezer (met Galerij) terug, maar
          // toont een navigatiebalkje dat niet gewenst is — terug naar volledig schermvullend.
          // Op Samsung-apparaten kan een bestaande foto nog altijd via "Bestanden" > Camera
          // gekozen worden; alleen de Galerij-snelkoppeling in de kiezer ontbreekt daar.
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
