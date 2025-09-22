import { rmSync } from 'fs'
import path from 'path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import pkg from './package.json'

// https://vitejs.dev/config/
// @ts-ignore
export default defineConfig(({ command }) => {
  rmSync('dist', { recursive: true, force: true })
  rmSync('release', { recursive: true, force: true })

  const isBuild = command === 'build'
  return {
    build: {
      rollupOptions: {
        output: {
          chunkFileNames: '[name].js',
          entryFileNames: '[name].js',
          assetFileNames: '[name].[ext]'
        }
      }
    },
    esbuild: isBuild ? { drop: ['console', 'debugger'] } : {},
    plugins: [
      vue({
        template: {
          compilerOptions: {
            isCustomElement: (tag) => tag == 'Webview'
          }
        }
      }),
      electron([
        {
          // Main process entry file of the Electron App.
          entry: 'electron/main/index.ts',
          onstart({ startup }) {
            if (process.env.VSCODE_DEBUG) {
              console.log(/* For `.vscode/.debug.script.mjs` */ '[startup] Electron App')
            } else {
              startup()
            }
          },
          vite: {
            build: {
              minify: isBuild,
              outDir: 'dist/electron/main',
              rollupOptions: {
                // Some third-party Node.js libraries may not be built correctly by Vite, especially `C/C++` addons,
                // we can use `external` to exclude them to ensure they work correctly.
                // Others need to put them in `dependencies` to ensure they are collected into `app.asar` after the app is built.
                // Of course, this is not absolute, just this way is relatively simple. :)
                // @ts-ignore
                external: Object.keys('dependencies' in pkg ? pkg.dependencies : {})
              }
            }
          }
        },
        {
          entry: path.join(__dirname, 'electron/preload/index.ts'),
          onstart({ reload }) {
            // Notify the Renderer process to reload the page when the Preload scripts build is complete,
            // instead of restarting the entire Electron App.
            reload()
          },
          vite: {
            build: {
              minify: isBuild,
              outDir: 'dist/electron/preload',
              rollupOptions: {
                // @ts-ignore
                external: Object.keys('dependencies' in pkg ? pkg.dependencies : {})
              }
            }
          }
        }
      ]),
      // Use Node.js API in the Renderer process
      renderer()
    ],
    server:
      process.env.VSCODE_DEBUG &&
      (() => {
        const url = new URL(pkg.debug.env.VITE_DEV_SERVER_URL)
        return {
          host: url.hostname,
          port: +url.port
        }
      })()
  }
})
