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
			return [
				cache.get(queryFn) ?? cache.set(queryFn, new Map()).get(queryFn)!,
				JSON.stringify(args) as unknown as Stringified<Parameters<A>>
			]
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
			set((state) => {
				/**
				 * `setCache` is called strongly after `getCache`:
				 * `getCache` guarantees that cache for `queryFn` is created
				 */
				const [queryCache, queryArgs] = getCache(queryFn, args)
				queryCache.set(queryArgs, { ...queryCache.get(queryArgs)!, ...newState })
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
			if (!queryCache.has(queryArgs)) {
				queryResult = {
					refetch: () => get().refetch(queryFn, args),
					promise: Promise.resolve()
				}
				queryCache.set(queryArgs, queryResult)
				if (queryConfig.autofetch)
					queryResult
						.refetch()
						.finally(() => setTimeout(() => deleteCache(queryFn, args), queryConfig.lifetime))
			}
			// eslint-disable-next-line no-var
			var queryResult = queryCache.get(queryArgs)!
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
			): Promise<Awaited<ReturnType<A>>> {
				// TODO: не оптимально, что promise и loading перезаписываются в executeQuery, если autofetch = true
				// eslint-disable-next-line prefer-spread
				const promise = queryFn.apply(null, args).then(
					(data: Awaited<ReturnType<typeof queryFn>>) => (
						setCache(queryFn, args, { data, loading: false }), data
					),
					(error: unknown) => setCache(queryFn, args, { error, loading: false })
				)
				setCache(queryFn, args, { promise, loading: true })
				return promise as Promise<Awaited<ReturnType<A>>>
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
