import type { StateCreator } from 'zustand'
import type { CacheMap, CacheRecord } from './types/cache'
import type { QueryInit, QueryStore } from './types/query-config'
// import type { QueryResponse } from './types/query-response'
import { QueryResponse } from './types/query-response'
import type { ZustandQueries } from './types/store'
import { AsyncFunction, Stringified } from './types/utils'

const defaultConfig: QueryStore = {
	autofetch: true,
	lifetime: 300000
}

export const createClient =
	<T extends QueryStore>(queryStoreProto: T = defaultConfig as T): StateCreator<ZustandQueries> =>
	(set, get) => {
		// @ts-expect-error
		const serialaze: <Args extends any[]>(args: Args) => Stringified<Args> = JSON.stringify

		const updateState = () => set((state) => ({ cache: new Map(state.cache) as CacheMap }))

		const getCache = <A extends AsyncFunction>(queryFn: A): CacheRecord<A> | undefined =>
			get().cache.get(queryFn)

		function deleteCache<A extends AsyncFunction>(
			queryFn: A,
			queryArgs: Stringified<Parameters<A>>
		) {
			getCache(queryFn)!.delete(queryArgs)
			updateState()
		}

		function setCache<A extends AsyncFunction>(
			queryFn: A,
			queryArgs: Stringified<Parameters<A>>,
			newState?: Partial<QueryResponse<A>>
		) {
			/**
			 * `setCache` is called strongly after `executeQuery`:
			 * `executeQuery` guarantees that cache for `queryFn` is created
			 */
			const queryCache = getCache(queryFn)!
			queryCache.set(queryArgs, { ...queryCache.get(queryArgs)!, ...newState })
			updateState()
		}

		function refetchQuery<A extends AsyncFunction>(
			queryFn: A,
			args = [] as unknown as Parameters<A>,
			queryArgs: Stringified<Parameters<A>>
		): Promise<Awaited<ReturnType<A>>> {
			// TODO: не оптимально, что promise и loading перезаписываются в executeQuery, если autofetch = true
			// eslint-disable-next-line prefer-spread
			const promise = queryFn.apply(null, args).then(
				(data: Awaited<ReturnType<typeof queryFn>>) => (
					setCache(queryFn, queryArgs, { data, loading: false }), data
				),
				(error: unknown) => setCache(queryFn, queryArgs, { error, loading: false })
			)
			setCache(queryFn, queryArgs, { promise, loading: true })
			return promise as Promise<Awaited<ReturnType<A>>>
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

			const queryCache = getCache(queryFn) ?? get().cache.set(queryFn, new Map()).get(queryFn)!
			const queryArgs = serialaze(args)
			if (!queryCache.has(queryArgs)) {
				const refetch = () => refetchQuery(queryFn, args, queryArgs)
				queryCache.set(queryArgs, { promise: Promise.resolve(), refetch })
				if (queryConfig.autofetch)
					refetch().finally(() =>
						setTimeout(() => deleteCache(queryFn, queryArgs), queryConfig.lifetime)
					)
			}
			const queryResult = queryCache.get(queryArgs)!
			if (suspense) {
				if ('error' in queryResult) throw queryResult.error
				// eslint-disable-next-line @typescript-eslint/no-unsafe-return
				if (!('data' in queryResult)) throw queryResult.promise
			}
			return queryResult
		}

		return {
			cache: new Map() as CacheMap,
			refetch: <A extends AsyncFunction>(
				queryFn: A,
				args = [] as unknown as Parameters<A>
			): Promise<Awaited<ReturnType<A>>> => refetchQuery(queryFn, args, serialaze(args)),
			invalidate<A extends AsyncFunction>(
				queryFn: A,
				args = [] as unknown as Parameters<A>,
				data?: Awaited<ReturnType<A>>
			) {
				const queryArgs = serialaze(args)
				if (data) setCache(queryFn, queryArgs, { data, loading: false })
				else {
					deleteCache(queryFn, queryArgs)
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
