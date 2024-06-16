import type { StateCreator } from 'zustand'
import type { CacheMap } from './types/cache'
import type { QueryInit, QueryStore } from './types/query-config'
import type { PendingQueryResponse } from './types/query-response'
import type { ZustandQueries } from './types/store'
import type { Stringified } from './types/utils'

export const createClient =
	<T extends QueryStore>(queryStoreProto: T): StateCreator<ZustandQueries<T>> =>
	(set, get) => ({
		cache: new Map() as CacheMap,
		invalidate(queryFn, args) {
			const cache = get().cache
			const queryCache = cache.get(queryFn) ?? cache.set(queryFn, new Map()).get(queryFn)!
			const queryArgs = JSON.stringify(args) as unknown as Stringified<typeof args>
			if (queryCache.has(queryArgs)) {
				queryCache.delete(queryArgs)
				set({ cache: new Map(get().cache) as CacheMap })
			}
		},
		update(queryFn, args) {
			const state = get()
			state.invalidate(queryFn, args)
			state.useQuery(queryFn, args)
		},
		// @ts-expect-error
		useQuery(queryFn, args) {
			const queryConfig: QueryInit = queryStoreProto
			const cache = get().cache
			const queryCache = cache.get(queryFn) ?? cache.set(queryFn, new Map()).get(queryFn)!
			const queryArgs = JSON.stringify(args) as unknown as Stringified<typeof args>
			const queryResult = queryCache.get(queryArgs)

			if (queryResult) {
				if (queryConfig.suspense) {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
					if (queryResult.isError) throw queryResult.error
					// eslint-disable-next-line @typescript-eslint/no-unsafe-return
					if (queryResult.isSuccess) return queryResult.data
					// @ts-expect-error
					throw queryResult.promise
				}
				return queryResult
			} else {
				// eslint-disable-next-line prefer-spread
				const promise = queryFn
					.apply(null, args)
					.then(
						(data: Awaited<ReturnType<typeof queryFn>>) => {
							set((state) => {
								state.cache.get(queryFn)!.set(queryArgs, {
									data,
									promise,
									isSuccess: true,
									isLoading: false
								})
								return {
									cache: new Map(state.cache) as CacheMap
								}
							})
						},
						(error: unknown) => {
							set((state) => {
								state.cache.get(queryFn)!.set(queryArgs, {
									error,
									promise,
									isError: true,
									isLoading: false
								})
								return {
									cache: new Map(state.cache) as CacheMap
								}
							})
						}
					)
					.finally(() => {
						if (queryConfig.lifetime) {
							setTimeout(
								queryConfig.refetch
									? () => get().update(queryFn, args)
									: () => get().invalidate(queryFn, args),
								queryConfig.lifetime
							)
						}
					})
				const rawCache: PendingQueryResponse = { promise, isLoading: true }
				// @ts-expect-error
				queryCache.set(queryArgs, rawCache)
				if (queryConfig.suspense) throw promise
				return rawCache
			}
		}
	})
