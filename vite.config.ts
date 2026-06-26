import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

/** VueUse 14.3.0 — misplaced PURE comments trigger Rolldown INVALID_ANNOTATION on Vite 8. */
function stripVueUsePureAnnotations(): Plugin {
  return {
    name: 'strip-vueuse-pure-annotations',
    enforce: 'pre',
    transform(code, id) {
      if (!id.includes('@vueuse/core')) return
      if (!code.includes('__PURE__')) return
      return {
        code: code
          .replace(/\/\*\s*#__PURE__\s*\*\/\s*\n/g, '\n')
          .replace(/\(\s*\/\*\s*#__PURE__\s*\*\/\s*/g, '('),
        map: null,
      }
    },
  }
}

function suppressInvalidAnnotationLogs(): Plugin {
  return {
    name: 'suppress-invalid-annotation-logs',
    config() {
      return {
        build: {
          rolldownOptions: {
            onLog(level, log, defaultHandler) {
              if (log.code === 'INVALID_ANNOTATION') return
              if (typeof log.message === 'string' && log.message.includes('INVALID_ANNOTATION')) return
              defaultHandler(level, log)
            },
          },
        },
        optimizeDeps: {
          rolldownOptions: {
            onLog(level, log, defaultHandler) {
              if (log.code === 'INVALID_ANNOTATION') return
              if (typeof log.message === 'string' && log.message.includes('INVALID_ANNOTATION')) return
              defaultHandler(level, log)
            },
          },
        },
      }
    },
  }
}

export default defineConfig({
  plugins: [
    stripVueUsePureAnnotations(),
    suppressInvalidAnnotationLogs(),
    vue(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Nexus — Student OS',
        short_name: 'Nexus',
        description: 'Personal command center for DS/SE students',
        theme_color: '#007AFF',
        background_color: '#F2F2F7',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
