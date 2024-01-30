import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import svgr from '@svgr/rollup'
import { URL, pathToFileURL } from 'url'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        external: ['sqlite3'],
        output: {
          format: 'es'
        }
      },
      asar: false
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        external: ['sqlite3'],
        output: {
          format: 'es'
        }
      },
      asar: false
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': new URL('./src/renderer/src', import.meta.url)
      }
    },
    build: {
      rollupOptions: {
        external: ['sqlite3'],
        output: {
          format: 'es'
        }
      }
    },
    plugins: [react(), svgr()],
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
      contextIsolation: false
    }
  }
})
