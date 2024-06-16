import { describe, expect, it } from 'vitest'

import { createStore } from 'zustand'
import { createClient } from '../lib'

describe('Zustand with Vanilla JS', () => {
	it('creates store properly', () => {
		// const asyncFunction = () => Promise.resolve(1)
		const cacheStore = createStore(createClient({}))
		expect(cacheStore).toBeDefined()
	})
})
