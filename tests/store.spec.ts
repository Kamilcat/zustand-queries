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
		.mockRejectedValue('500 server error'),
	successInvalidate: vi.fn().mockResolvedValueOnce(17).mockResolvedValue(27),
	waitForSuccess: vi.fn(() => new Promise((resolve) => setTimeout(() => resolve(12), 3000)))
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

		expect(queryResult).toHaveProperty('loading')
		expect(queryResult.loading).toBeTruthy()

		expect(queryResult).toHaveProperty('promise')
		expect(queryResult.promise).toBeInstanceOf(Promise)

		expect(queryResult).not.toHaveProperty('data')
		expect(queryResult).not.toHaveProperty('error')

		// Re-call to check if result for argument 15 is cached
		setTimeout(() => {
			const resolvedQueryResult = useQuery(mockFn.success, [15])
			expect(resolvedQueryResult).toBeTypeOf('object')
			expect(resolvedQueryResult).toHaveProperty('data')
			expect(resolvedQueryResult.data).toBeTypeOf('number')
			expect(resolvedQueryResult.data).equals(30)
		})

		// Call again to check if cached result didn't change
		setTimeout(() => {
			const resolvedQueryResult = useQuery(mockFn.success, [15])
			expect(resolvedQueryResult).toBeTypeOf('object')
			expect(resolvedQueryResult).toHaveProperty('data')
			expect(resolvedQueryResult.data).toBeTypeOf('number')
			expect(resolvedQueryResult.data).equals(30)
		})

		// Not cached query
		setTimeout(() => {
			const resolvedQueryResult = useQuery(mockFn.success)
			expect(resolvedQueryResult).toBeTypeOf('object')
			expect(resolvedQueryResult).toHaveProperty('loading')
			expect(resolvedQueryResult.loading).toBeTruthy()
			expect(resolvedQueryResult).not.toHaveProperty('data')
			expect(resolvedQueryResult).not.toHaveProperty('error')
		})
	})

	it('serves promise caught error', () => {
		expect(cacheStore).toBeDefined()

		const state = cacheStore.getState()
		const queryResult = state.useQuery(mockFn.error)

		expect(queryResult).toBeTypeOf('object')

		expect(queryResult).toHaveProperty('loading')
		expect(queryResult.loading).toBeTruthy()

		expect(queryResult).toHaveProperty('promise')
		expect(queryResult.promise).toBeInstanceOf(Promise)

		expect(queryResult).not.toHaveProperty('data')
		expect(queryResult).not.toHaveProperty('error')

		setTimeout(() => {
			const rejectedQueryResult = state.useQuery(mockFn.error)
			expect(rejectedQueryResult).toBeTypeOf('object')
			expect(rejectedQueryResult).toHaveProperty('loading')
			expect(rejectedQueryResult.loading).toBeFalsy()

			expect(rejectedQueryResult).toHaveProperty('error')
			expect(rejectedQueryResult.error).toBeTypeOf('string')
			expect(rejectedQueryResult.error).equals('something went wrong')

			expect(rejectedQueryResult).not.toHaveProperty('data')
		})
	})

	it('invalidates cache', () => {
		const { useQuery, invalidate } = cacheStore.getState()

		const queryResult = useQuery(mockFn.successInvalidate)
		expect(queryResult).not.toHaveProperty('data')

		setTimeout(() => {
			const resolvedQueryResult = useQuery(mockFn.successInvalidate)
			expect(resolvedQueryResult.data).equals(17)
			invalidate(mockFn.successInvalidate)

			setTimeout(() => {
				const nextResult = useQuery(mockFn.successInvalidate)
				expect(nextResult.data).equals(27)
				invalidate(mockFn.successInvalidate, [15])
			})
		})
	})

	it('manual fetch works correctly', () => {
		expect(cacheStore).toBeDefined()
		const { useQuery } = cacheStore.getState()

		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const { data, loading, error, refetch } = useQuery(mockFn.success, [18], { autofetch: false })

		expect(loading).toBeFalsy()
		expect(data).toBeUndefined()
		expect(error).toBeUndefined()
		expect(refetch).toBeTypeOf('function')

		const refetchResponse = refetch()
		expect(refetchResponse.loading).toBeTruthy()
		expect(refetchResponse.data).toBeUndefined()
		expect(refetchResponse.error).toBeUndefined()
		expect(refetchResponse.refetch).toBeTypeOf('function')

		setTimeout(() => {
			const successfulQueryResult = useQuery(mockFn.success, [18])
			expect(successfulQueryResult).toBeTypeOf('object')
			expect(successfulQueryResult).toHaveProperty('loading')
			expect(successfulQueryResult.loading).toBeFalsy()

			expect(successfulQueryResult).not.toHaveProperty('error')
			expect(successfulQueryResult).toHaveProperty('data')
			expect(successfulQueryResult.data).toEqual(36)
		})
	})

	it('suspended mode works with resolving Promise', () => {
		const { useSuspendedQuery } = cacheStore.getState()

		try {
			useSuspendedQuery(mockFn.success, [15])
		} catch (thrownObject) {
			expect(thrownObject).toBeInstanceOf(Promise)
			// @ts-expect-error
			// eslint-disable-next-line @typescript-eslint/no-unsafe-call
			thrownObject.then(() => {
				const resolvedQueryResult = useSuspendedQuery(mockFn.success, [15])
				expect(resolvedQueryResult).equals(30)
			})
		}

		setTimeout(() => {
			const resolvedQueryResult = useSuspendedQuery(mockFn.success, [15])
			expect(resolvedQueryResult).equals(30)
		})
	})

	it('suspended mode works with rejecting Promise', () => {
		const { useSuspendedQuery } = cacheStore.getState()

		try {
			useSuspendedQuery(mockFn.error)
		} catch (thrownObject) {
			expect(thrownObject).toBeInstanceOf(Promise)
		}

		setTimeout(() => {
			try {
				useSuspendedQuery(mockFn.error)
			} catch (error) {
				expect(error).not.toBeInstanceOf(Promise)
				expect(error).toBeTypeOf('string')
				expect(error).toEqual('something went wrong')
			}
		})
	})

	it('suspended mode works with long time resolving Promise', () => {
		const { useSuspendedQuery } = cacheStore.getState()

		try {
			useSuspendedQuery(mockFn.waitForSuccess)
		} catch (thrownObject) {
			expect(thrownObject).toBeInstanceOf(Promise)
		}

		setTimeout(() => {
			try {
				useSuspendedQuery(mockFn.waitForSuccess)
			} catch (thrownObject) {
				expect(thrownObject).toBeInstanceOf(Promise)
				setTimeout(() => {
					const result = useSuspendedQuery(mockFn.waitForSuccess)
					expect(result).toEqual(13)
				}, 3500)
			}
		})
	})
})
