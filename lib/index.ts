import type { StateCreator } from 'zustand'
import type { CacheMap, CacheRecord } from './types/cache'
import type { QueryInit, QueryStore } from './types/query-config'
// import type { QueryResponse } from './types/query-response'
import { QueryResponse } from './types/query-response'
import type { ZustandQueries } from './types/store'
import { AsyncFunction, Stringified } from './types/utils'

const autoFetch: QueryStore = {
	autofetch: true
}

const defaultConfig: QueryStore = {
	...autoFetch,
	lifetime: 300000
}

export const createClient =
	<T extends QueryStore>(queryStoreProto: T = defaultConfig as T): StateCreator<ZustandQueries> =>
	(set, get) => {
		function getCache<A extends AsyncFunction>(
			queryFn: A,
			args: Parameters<A>
		): [CacheRecord<A>, Stringified<Parameters<A>>] {
			const cache = get().cache
			const queryCache = cache.get(queryFn) ?? cache.set(queryFn, new Map()).get(queryFn)!
			const queryArgs = JSON.stringify(args) as unknown as Stringified<Parameters<A>>
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
			args: Parameters<A>,
			newState?: Partial<QueryResponse<A>>
		) {
			const queryArgs = JSON.stringify(args) as unknown as Stringified<Parameters<A>>
			set((state) => {
				/**
				 * `setCache` is called strongly after `getCache`:
				 * `getCache` guarantees that cache for `queryFn` is created
				 */
				const cache = state.cache.get(queryFn)!
				const newData = { ...cache.get(queryArgs)!, ...newState }
				cache.set(queryArgs, newData)
				return { cache: new Map(state.cache) as CacheMap }
			})
		}

		function executeQuery<A extends AsyncFunction>(
			suspense: boolean,
			queryFn: A,
			args = [] as unknown as Parameters<A>,
			queryInit?: QueryInit
		) {
			const queryConfig = queryInit
				? (Object.setPrototypeOf(queryInit, queryStoreProto) as QueryInit)
				: (queryStoreProto as QueryInit)
			const [queryCache, queryArgs] = getCache(queryFn, args)
			let queryResult = queryCache.get(queryArgs)
			if (!queryResult) {
				const refetch = () =>
					get()
						.refetch(queryFn, args)
						.finally(() => setTimeout(() => deleteCache(queryFn, args), queryConfig.lifetime))
				queryResult = {
					refetch,
					promise: queryConfig.autofetch ? refetch() : Promise.resolve(),
					loading: queryConfig.autofetch
				}
				queryCache.set(queryArgs, queryResult)
			}
			if (suspense) {
				if ('error' in queryResult) throw queryResult.error
				// eslint-disable-next-line @typescript-eslint/no-unsafe-return
				if (!('data' in queryResult)) throw queryResult.promise
			}
			return queryResult
		}

		return {
			cache: new Map() as CacheMap,
			refetch<A extends AsyncFunction>(
				queryFn: A,
				args = [] as unknown as Parameters<A>
			): Promise<void> {
				// eslint-disable-next-line prefer-spread
				const promise = queryFn.apply(null, args).then(
					(data: Awaited<ReturnType<typeof queryFn>>) =>
						setCache(queryFn, args, { data, loading: false }),
					(error: unknown) => setCache(queryFn, args, { error, loading: false })
				)
				setCache(queryFn, args, { promise, loading: true })
				return promise
			},
			invalidate<A extends AsyncFunction>(
				queryFn: A,
				args = [] as unknown as Parameters<A>,
				data?: Awaited<ReturnType<A>>
			) {
				if (data) setCache(queryFn, args, { data, loading: false })
				else {
					deleteCache(queryFn, args)
					void get().refetch(queryFn, args)
				}
			},
			useSuspendedQuery: <A extends AsyncFunction>(
				queryFn: A,
				args = [] as unknown as Parameters<A>,
				queryInit?: QueryInit
			) => executeQuery(true, queryFn, args, queryInit),
			useQuery: <A extends AsyncFunction>(
				queryFn: A,
				args = [] as unknown as Parameters<A>,
				queryInit?: QueryInit
			) => executeQuery(false, queryFn, args, queryInit)
		}
	}
