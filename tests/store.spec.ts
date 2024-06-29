import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createStore, StoreApi } from 'zustand'
import { createCache, type ZustandQueries } from '../lib'

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

describe('Zustand with Vanilla JS', () => {
	beforeEach(() => {
		cacheStore = createStore(createCache())
	})

	it('creates cache store properly', () => {
		expect(cacheStore).toBeDefined()

		const state = cacheStore.getState()
		expect(state).toHaveProperty('$cache')
		expect(state).toHaveProperty('$invalidate')
		expect(state).toHaveProperty('$query')
		expect(state).toHaveProperty('$suspenseQuery')
	})

	it('executes query and caches result for given arguments', () => {
		const { $query } = cacheStore.getState()

		// Call query mockFn.success with argument 15
		const queryResult = $query(mockFn.success, [15])

		expect(queryResult).toBeTypeOf('object')

		expect(queryResult).toHaveProperty('loading')
		expect(queryResult.loading).toBeTruthy()

		expect(queryResult).toHaveProperty('promise')
		expect(queryResult.promise).toBeInstanceOf(Promise)

		expect(queryResult).not.toHaveProperty('data')
		expect(queryResult).not.toHaveProperty('error')

		// Re-call to check if result for argument 15 is cached
		setTimeout(() => {
			const resolvedQueryResult = $query(mockFn.success, [15])
			expect(resolvedQueryResult).toBeTypeOf('object')
			expect(resolvedQueryResult).toHaveProperty('data')
			expect(resolvedQueryResult.data).toBeTypeOf('number')
			expect(resolvedQueryResult.data).equals(30)
		})

		// Call again to check if cached result didn't change
		setTimeout(() => {
			const resolvedQueryResult = $query(mockFn.success, [15])
			expect(resolvedQueryResult).toBeTypeOf('object')
			expect(resolvedQueryResult).toHaveProperty('data')
			expect(resolvedQueryResult.data).toBeTypeOf('number')
			expect(resolvedQueryResult.data).equals(30)
		})

		// Not cached query
		setTimeout(() => {
			const resolvedQueryResult = $query(mockFn.success)
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
		const queryResult = state.$query(mockFn.error)

		expect(queryResult).toBeTypeOf('object')

		expect(queryResult).toHaveProperty('loading')
		expect(queryResult.loading).toBeTruthy()

		expect(queryResult).toHaveProperty('promise')
		expect(queryResult.promise).toBeInstanceOf(Promise)

		expect(queryResult).not.toHaveProperty('data')
		expect(queryResult).not.toHaveProperty('error')

		setTimeout(() => {
			const rejectedQueryResult = state.$query(mockFn.error)
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
		const { $query, $invalidate } = cacheStore.getState()

		const queryResult = $query(mockFn.successInvalidate)
		expect(queryResult).not.toHaveProperty('data')

		setTimeout(() => {
			const resolvedQueryResult = $query(mockFn.successInvalidate)
			expect(resolvedQueryResult.data).equals(17)
			$invalidate(mockFn.successInvalidate)
		})

		setTimeout(() => {
			expect(mockFn.successInvalidate).toBeTypeOf('function')
			const nextResult = $query(mockFn.successInvalidate)
			expect(nextResult.data).equals(27)
		})
	})

	it.skip('invalidates undefined cache', () => {
		const { $query, $invalidate } = cacheStore.getState()

		const queryResult = $query(mockFn.successInvalidate)
		expect(queryResult).not.toHaveProperty('data')

		setTimeout(() => {
			$query(mockFn.successInvalidate)
			$invalidate(mockFn.successInvalidate, [15])
		})
	})

	it('manual fetch works correctly', () => {
		expect(cacheStore).toBeDefined()
		const { $query } = cacheStore.getState()

		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const { data, loading, error, refetch } = $query(mockFn.success, [18], { autofetch: false })

		expect(loading).toBeFalsy()
		expect(data).toBeUndefined()
		expect(error).toBeUndefined()
		expect(refetch).toBeTypeOf('function')

		void refetch()
		const refetchResponse = $query(mockFn.success, [18])
		expect(refetchResponse.loading).toBeTruthy()
		expect(refetchResponse.data).toBeUndefined()
		expect(refetchResponse.error).toBeUndefined()
		expect(refetchResponse.refetch).toBeTypeOf('function')

		setTimeout(() => {
			const successfulQueryResult = $query(mockFn.success, [18])
			expect(successfulQueryResult).toBeTypeOf('object')
			expect(successfulQueryResult).toHaveProperty('loading')
			expect(successfulQueryResult.loading).toBeFalsy()

			expect(successfulQueryResult).not.toHaveProperty('error')
			expect(successfulQueryResult).toHaveProperty('data')
			expect(successfulQueryResult.data).toEqual(36)
		})
	})

	it('suspended mode works with resolving Promise', () => {
		const { $suspenseQuery } = cacheStore.getState()

		try {
			$suspenseQuery(mockFn.success, [15])
		} catch (thrownObject) {
			expect(thrownObject).toBeInstanceOf(Promise)
			// @ts-expect-error
			// eslint-disable-next-line @typescript-eslint/no-unsafe-call
			thrownObject.then(() => {
				const resolvedQueryResult = $suspenseQuery(mockFn.success, [15])
				expect(resolvedQueryResult.data).equals(30)
			})
		}

		setTimeout(() => {
			const resolvedQueryResult = $suspenseQuery(mockFn.success, [15])
			expect(resolvedQueryResult.data).equals(30)
		})
	})

	it('suspended mode works with rejecting Promise', () => {
		const { $suspenseQuery } = cacheStore.getState()

		try {
			$suspenseQuery(mockFn.error)
		} catch (thrownObject) {
			expect(thrownObject).toBeInstanceOf(Promise)
		}

		setTimeout(() => {
			try {
				$suspenseQuery(mockFn.error)
			} catch (error) {
				expect(error).not.toBeInstanceOf(Promise)
				expect(error).toBeTypeOf('string')
				expect(error).toEqual('something went wrong')
			}
		})
	})

	it('suspended mode works with long time resolving Promise', () => {
		const { $suspenseQuery } = cacheStore.getState()

		try {
			$suspenseQuery(mockFn.waitForSuccess)
		} catch (thrownObject) {
			expect(thrownObject).toBeInstanceOf(Promise)
		}

		setTimeout(() => {
			try {
				$suspenseQuery(mockFn.waitForSuccess)
			} catch (thrownObject) {
				expect(thrownObject).toBeInstanceOf(Promise)
				setTimeout(() => {
					const result = $suspenseQuery(mockFn.waitForSuccess)
					expect(result).toEqual(13)
				}, 3500)
			}
		})
	})
})
