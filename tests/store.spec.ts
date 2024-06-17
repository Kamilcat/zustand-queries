import { beforeEach, describe, expect, it } from 'vitest'

import { createStore, StoreApi } from 'zustand'
import { createClient } from '../lib'
import { ZustandQueries } from '../lib/types/store'

let cacheStore: StoreApi<ZustandQueries<{}>>

beforeEach(() => {
	cacheStore = createStore(createClient({}))
})

describe('Zustand with Vanilla JS', () => {
	it('creates cache store properly', () => {
		expect(cacheStore).toBeDefined()

		const state = cacheStore.getState()
		expect(state).toHaveProperty('cache')
		expect(state).toHaveProperty('invalidate')
		expect(state).toHaveProperty('update')
		expect(state).toHaveProperty('useQuery')
	})

	it('executes query and caches result', () => {
		const asyncFunction = (x: number) => Promise.resolve(x * 2)
		const state = cacheStore.getState()
		const queryResult = state.useQuery(asyncFunction, [15])

		expect(queryResult).toBeTypeOf('object')

		expect(queryResult).toHaveProperty('isLoading')
		expect(queryResult.isLoading).toBeTruthy()

		expect(queryResult).toHaveProperty('promise')
		expect(queryResult.promise).toBeInstanceOf(Promise)

		expect(queryResult).not.toHaveProperty('data')
		expect(queryResult).not.toHaveProperty('isSuccess')
		expect(queryResult).not.toHaveProperty('error')
		expect(queryResult).not.toHaveProperty('isError')

		// First call
		setTimeout(() => {
			const resolvedQueryResult = state.useQuery(asyncFunction, [15])
			expect(resolvedQueryResult).toBeTypeOf('object')
			expect(resolvedQueryResult).toHaveProperty('isSuccess')
			expect(resolvedQueryResult.isSuccess).toBeTruthy()
			expect(resolvedQueryResult).toHaveProperty('data')
			expect(resolvedQueryResult.data).toBeTypeOf('number')
			expect(resolvedQueryResult.data).equals(30)
		})

		// Call again to check if result didn't change
		setTimeout(() => {
			const resolvedQueryResult = state.useQuery(asyncFunction, [15])
			expect(resolvedQueryResult).toBeTypeOf('object')
			expect(resolvedQueryResult).toHaveProperty('isSuccess')
			expect(resolvedQueryResult.isSuccess).toBeTruthy()
			expect(resolvedQueryResult).toHaveProperty('data')
			expect(resolvedQueryResult.data).toBeTypeOf('number')
			expect(resolvedQueryResult.data).equals(30)
		})

		// Not cached query
		setTimeout(() => {
			const resolvedQueryResult = state.useQuery(asyncFunction, [10])
			expect(resolvedQueryResult).toBeTypeOf('object')
			expect(resolvedQueryResult).toHaveProperty('isLoading')
			expect(resolvedQueryResult.isLoading).toBeTruthy()
			expect(resolvedQueryResult).not.toHaveProperty('data')
			expect(resolvedQueryResult).not.toHaveProperty('error')
		})
	})
})
