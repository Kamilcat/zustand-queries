import { resolve } from 'path'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
	plugins: [dts({ insertTypesEntry: true })],
	build: {
		lib: {
			entry: resolve(__dirname, 'lib/index.ts'),
			name: 'ZustandReactQuery',
			fileName: 'index'
		},
		rollupOptions: {
			external: ['zustand', '@tanstack/react-query'],
			output: {
				globals: {
					zustand: 'Zustand',
					'@tanstack/react-query': 'ReactQuery'
				}
			}
		}
	}
})
