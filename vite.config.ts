import { resolve } from 'path'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
	plugins: [dts({ insertTypesEntry: true })],
	build: {
		lib: {
			entry: resolve(__dirname, 'lib/index.ts'),
			name: 'ZustandQueries',
			fileName: 'index'
		},
		rollupOptions: {
			external: ['zustand'],
			output: {
				globals: {
					zustand: 'Zustand'
				}
			}
		}
	}
})
