import type { StateCreator } from 'zustand'
import type { CacheMap, CacheRecord } from './types/cache'
import type { QueryInit, QueryStore } from './types/query-config'
import type { QueryResponse } from './types/query-response'
import type { ZustandQueries } from './types/store'
import { AsyncFunction, Stringified } from './types/utils'

type CacheSerializer = <T extends any[]>(obj: T) => Stringified<T>
// @ts-expect-error
const serialize: CacheSerializer = JSON.stringify

export const createClient =
	<T extends QueryStore>(
		queryStoreProto = { autofetch: true } as T
	): StateCreator<ZustandQueries> =>
	// @ts-expect-error
	(set, get) => {
		function getCache<A extends AsyncFunction>(
			queryFn: A,
			args: Parameters<A>
		): [CacheRecord<A>, Stringified<Parameters<A>>] {
			const cache = get().cache
			const queryCache = cache.get(queryFn) ?? cache.set(queryFn, new Map()).get(queryFn)!
			const queryArgs = serialize(args)
			return [queryCache, queryArgs]
		}

		function deleteCache<A extends AsyncFunction>(queryFn: A, args: Parameters<A>) {
			const [queryCache, queryArgs] = getCache(queryFn, args)
			if (queryCache.has(queryArgs)) {
				queryCache.delete(queryArgs)
				set({ cache: new Map(get().cache) as CacheMap })
			}
		}

		function setCache<A extends AsyncFunction>(
			queryFn: A,
			queryArgs: Stringified<Parameters<A>>,
			newState: QueryResponse<A>
		) {
			set(
				(state) => (
					state.cache.get(queryFn)!.set(queryArgs, newState),
					{ cache: new Map(state.cache) as CacheMap }
				)
			)
		}

		function fetchPromise<A extends AsyncFunction>(
			queryFn: A,
			args: Parameters<A>,
			queryCache: CacheRecord<A>,
			queryArgs: Stringified<Parameters<A>>,
			queryInit?: QueryInit
		): QueryResponse<A> {
			const queryConfig = queryInit
				? (Object.setPrototypeOf(queryInit, queryStoreProto) as QueryInit)
				: (queryStoreProto as QueryInit)

			const refetch = () => fetchPromise(queryFn, args, queryCache, queryArgs, queryInit)

			const promise: Promise<void> = queryConfig.autofetch
				? // eslint-disable-next-line prefer-spread
					queryFn
						.apply(null, args)
						.then(
							(data: Awaited<ReturnType<typeof queryFn>>) =>
								setCache(queryFn, queryArgs, {
									data,
									promise,
									loading: false,
									refetch
								}),
							(error: unknown) =>
								setCache(queryFn, queryArgs, {
									error,
									promise,
									loading: false,
									refetch
								})
						)
						.finally(() => {
							if (queryConfig.lifetime) {
								setTimeout(() => deleteCache(queryFn, args), queryConfig.lifetime)
							}
						})
				: Promise.resolve()
			const queryResult: QueryResponse<A> = {
				refetch,
				promise,
				loading: queryConfig.autofetch
			}
			queryCache.set(queryArgs, queryResult)
			return queryResult
		}

		return {
			cache: new Map() as CacheMap,
			invalidate<A extends AsyncFunction>(queryFn: A, args = [] as unknown as Parameters<A>) {
				deleteCache(queryFn, args)
				get().useQuery(queryFn, args)
			},
			useSuspendedQuery<A extends AsyncFunction>(
				queryFn: A,
				args = [] as unknown as Parameters<A>,
				queryInit?: QueryInit
			) {
				const [queryCache, queryArgs] = getCache(queryFn, args)
				const queryResult = queryCache.get(queryArgs)
				if (queryResult) {
					if ('error' in queryResult) throw queryResult.error
					// eslint-disable-next-line @typescript-eslint/no-unsafe-return
					if ('data' in queryResult) return queryResult.data
					throw queryResult.promise
				}
				throw fetchPromise(queryFn, args, queryCache, queryArgs, queryInit).promise
			},
			useQuery<A extends AsyncFunction>(
				queryFn: A,
				args = [] as unknown as Parameters<A>,
				queryInit?: QueryInit
			) {
				const [queryCache, queryArgs] = getCache(queryFn, args)
				return queryCache.has(queryArgs)
					? queryCache.get(queryArgs)!
					: fetchPromise(queryFn, args, queryCache, queryArgs, queryInit)
			}
		}
	}
