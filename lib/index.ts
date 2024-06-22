import type { StateCreator } from 'zustand'
import type { CacheMap, CacheRecord } from './types/cache'
import type { QueryInit, QueryStore } from './types/query-config'
import type { PendingQueryResponse, QueryResponse } from './types/query-response'
import type { ZustandQueries } from './types/store'
import { AsyncFunction, Stringified } from './types/utils'

type CacheSerializer = <T extends any[]>(obj: T) => Stringified<T>
// @ts-expect-error
const serialize: CacheSerializer = JSON.stringify

export const createClient =
	<T extends QueryStore>(queryStoreProto = {} as T): StateCreator<ZustandQueries> =>
	// @ts-expect-error
	(set, get) => {
		function resolveQueryConfig(queryInit?: QueryInit): QueryInit {
			return queryInit
				? (Object.setPrototypeOf(queryInit, queryStoreProto) as QueryInit)
				: (queryStoreProto as QueryInit)
		}

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
			queryArgs: Stringified<Parameters<A>>,
			queryInit?: QueryInit
		) {
			const queryConfig = resolveQueryConfig(queryInit)
			// eslint-disable-next-line prefer-spread
			const promise: Promise<void> = queryFn
				.apply(null, args)
				.then(
					(data: Awaited<ReturnType<typeof queryFn>>) =>
						setCache(queryFn, queryArgs, {
							data,
							promise,
							isSuccess: true,
							isLoading: false
						}),
					(error: unknown) =>
						setCache(queryFn, queryArgs, {
							error,
							promise,
							isError: true,
							isLoading: false
						})
				)
				.finally(() => {
					if (queryConfig.lifetime) {
						setTimeout(() => deleteCache(queryFn, args), queryConfig.lifetime)
					}
				})
			return promise
		}

		function getPendingQueryResult<A extends AsyncFunction>(
			queryFn: A,
			args: Parameters<A>,
			queryCache: CacheRecord<A>,
			queryArgs: Stringified<Parameters<A>>,
			queryInit?: QueryInit
		) {
			const queryResult = {
				promise: fetchPromise(queryFn, args, queryArgs, queryInit),
				isLoading: true
			} as PendingQueryResponse
			// @ts-expect-error
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
					if (queryResult.isError) throw queryResult.error
					// eslint-disable-next-line @typescript-eslint/no-unsafe-return
					if (queryResult.isSuccess) return queryResult.data
					// @ts-expect-error
					throw queryResult.promise
				}
				throw getPendingQueryResult(queryFn, args, queryCache, queryArgs, queryInit).promise
			},
			useQuery<A extends AsyncFunction>(
				queryFn: A,
				args = [] as unknown as Parameters<A>,
				queryInit?: QueryInit
			) {
				const [queryCache, queryArgs] = getCache(queryFn, args)
				return queryCache.has(queryArgs)
					? queryCache.get(queryArgs)!
					: getPendingQueryResult(queryFn, args, queryCache, queryArgs, queryInit)
			}
		}
	}
