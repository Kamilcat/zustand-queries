import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createStore, StoreApi } from 'zustand'
import { createClient } from '../lib'
import { ZustandQueries } from '../lib/types/store'

const mockFn = {
	success: vi.fn((integer: number) => Promise.resolve(integer * 2)),
	error: vi.fn().mockRejectedValue('something went wrong'),
	errorThenSuccess: vi
		.fn()
		.mockRejectedValueOnce('error happend on first try')
		.mockResolvedValue(1000),
	successThenError: vi
		.fn()
		.mockResolvedValueOnce('post title')
		.mockRejectedValue('500 server error')
}

let cacheStore: StoreApi<ZustandQueries>

beforeEach(() => {
	cacheStore = createStore(createClient())
})

describe('Zustand with Vanilla JS', () => {
	it('creates cache store properly', () => {
		expect(cacheStore).toBeDefined()

		const state = cacheStore.getState()
		expect(state).toHaveProperty('cache')
		expect(state).toHaveProperty('invalidate')
		expect(state).toHaveProperty('useQuery')
		expect(state).toHaveProperty('useSuspendedQuery')
	})

	it('executes query and caches result for given arguments', () => {
		const { useQuery } = cacheStore.getState()

		// Call query mockFn.success with argument 15
		const queryResult = useQuery(mockFn.success, [15])

		expect(queryResult).toBeTypeOf('object')

		expect(queryResult).toHaveProperty('isLoading')
		expect(queryResult.isLoading).toBeTruthy()

		expect(queryResult).toHaveProperty('promise')
		expect(queryResult.promise).toBeInstanceOf(Promise)

		expect(queryResult).not.toHaveProperty('data')
		expect(queryResult).not.toHaveProperty('isSuccess')
		expect(queryResult).not.toHaveProperty('error')
		expect(queryResult).not.toHaveProperty('isError')

		// Re-call to check if result for argument 15 is cached
		setTimeout(() => {
			const resolvedQueryResult = useQuery(mockFn.success, [15])
			expect(resolvedQueryResult).toBeTypeOf('object')
			expect(resolvedQueryResult).toHaveProperty('isSuccess')
			expect(resolvedQueryResult.isSuccess).toBeTruthy()
			expect(resolvedQueryResult).toHaveProperty('data')
			expect(resolvedQueryResult.data).toBeTypeOf('number')
			expect(resolvedQueryResult.data).equals(30)
		})

		// Call again to check if cached result didn't change
		setTimeout(() => {
			const resolvedQueryResult = useQuery(mockFn.success, [15])
			expect(resolvedQueryResult).toBeTypeOf('object')
			expect(resolvedQueryResult).toHaveProperty('isSuccess')
			expect(resolvedQueryResult.isSuccess).toBeTruthy()
			expect(resolvedQueryResult).toHaveProperty('data')
			expect(resolvedQueryResult.data).toBeTypeOf('number')
			expect(resolvedQueryResult.data).equals(30)
		})

		// Not cached query
		setTimeout(() => {
			const resolvedQueryResult = useQuery(mockFn.success)
			expect(resolvedQueryResult).toBeTypeOf('object')
			expect(resolvedQueryResult).toHaveProperty('isLoading')
			expect(resolvedQueryResult.isLoading).toBeTruthy()
			expect(resolvedQueryResult).not.toHaveProperty('data')
			expect(resolvedQueryResult).not.toHaveProperty('error')
		})
	})

	it('serves promise caught error', () => {
		expect(cacheStore).toBeDefined()

		const state = cacheStore.getState()
		const queryResult = state.useQuery(mockFn.error)

		expect(queryResult).toBeTypeOf('object')

		expect(queryResult).toHaveProperty('isLoading')
		expect(queryResult.isLoading).toBeTruthy()

		expect(queryResult).toHaveProperty('promise')
		expect(queryResult.promise).toBeInstanceOf(Promise)

		expect(queryResult).not.toHaveProperty('data')
		expect(queryResult).not.toHaveProperty('isSuccess')
		expect(queryResult).not.toHaveProperty('error')
		expect(queryResult).not.toHaveProperty('isError')

		setTimeout(() => {
			const rejectedQueryResult = state.useQuery(mockFn.error)
			expect(rejectedQueryResult).toBeTypeOf('object')
			expect(rejectedQueryResult).toHaveProperty('isLoading')
			expect(rejectedQueryResult.isLoading).toBeFalsy()

			expect(rejectedQueryResult).toHaveProperty('isError')
			expect(rejectedQueryResult.isError).toBeTruthy()

			expect(rejectedQueryResult).toHaveProperty('error')
			expect(rejectedQueryResult.error).toBeTypeOf('string')
			expect(rejectedQueryResult.error).equals('something went wrong')

			expect(rejectedQueryResult).not.toHaveProperty('data')
			expect(rejectedQueryResult).not.toHaveProperty('isSuccess')
		})
	})
})
