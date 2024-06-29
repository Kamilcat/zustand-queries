import type { StateCreator } from 'zustand'
import type { CacheMap, CacheRecord } from './types/cache'
import type { QueryInit } from './types/query-config'
import type { QueryResponse, SuspenseQueryResponse } from './types/query-response'
import type { ZustandQueries } from './types/store'
import { AsyncFunction, Stringified } from './types/utils'

export type { QueryInit, QueryResponse, SuspenseQueryResponse, ZustandQueries }

export const createCache =
	<T extends QueryInit>(
		queryStoreProto: T = {
			autofetch: true,
			lifetime: 300000
		} as T
	): StateCreator<ZustandQueries> =>
	(set, get) => {
		const timers = new WeakMap<() => Promise<any>, [timerID: number, delay: number]>()

		// @ts-expect-error
		const serialaze: <Args extends any[]>(args: Args) => Stringified<Args> = JSON.stringify

		const updateState = () => set((state) => ({ $cache: new Map(state.$cache) as CacheMap }))

		const getCache = <A extends AsyncFunction>(queryFn: A): CacheRecord<A> =>
			get().$cache.get(queryFn) ?? get().$cache.set(queryFn, new Map()).get(queryFn)!

		function setCache<A extends AsyncFunction>(
			queryFn: A,
			queryArgs: Stringified<Parameters<A>>,
			newState: Partial<QueryResponse<A>>
		) {
			const queryCache = getCache(queryFn)
			const queryResult = queryCache.get(queryArgs)!
			const oldTimer = timers.get(queryResult.refetch)!
			if (oldTimer[0]) clearTimeout(oldTimer[0])
			queryCache.set(queryArgs, { ...queryResult, ...newState })
			oldTimer[0] = setTimeout(() => {
				queryCache.delete(queryArgs)
				updateState()
			}, oldTimer[1]) as unknown as number
			updateState()
		}

		function refetchQuery<A extends AsyncFunction>(
			queryFn: A,
			args = [] as unknown as Parameters<A>,
			queryArgs: Stringified<Parameters<A>>
		): Promise<Awaited<ReturnType<A>>> {
			const promise = queryFn.apply(null, args).then(
				(data: Awaited<ReturnType<typeof queryFn>>) => (
					setCache(queryFn, queryArgs, { data, loading: false }), data
				),
				(error: unknown) => setCache(queryFn, queryArgs, { error, loading: false })
			)
			setCache(queryFn, queryArgs, { promise, loading: true })
			return promise as Promise<Awaited<ReturnType<A>>>
		}

		function executeQuery<A extends AsyncFunction, S extends boolean>(
			suspense: S,
			queryFn: A,
			args = [] as unknown as Parameters<A>,
			queryInit?: QueryInit
		) {
			const queryConfig = queryInit
				? (Object.setPrototypeOf(queryInit, queryStoreProto) as QueryInit)
				: (queryStoreProto as QueryInit)

			const queryCache = getCache(queryFn)
			const queryArgs = serialaze(args)
			if (!queryCache.has(queryArgs)) {
				const refetch = () => refetchQuery(queryFn, args, queryArgs)
				queryCache.set(queryArgs, { promise: Promise.resolve(), refetch })
				timers.set(refetch, [0, queryConfig.lifetime!])
				if (queryConfig.autofetch) void refetch()
			}
			const queryResult = queryCache.get(queryArgs)!
			if (suspense) {
				if ('error' in queryResult) throw queryResult.error
				if (!('data' in queryResult)) throw queryResult.promise
			}
			return queryResult as S extends true ? SuspenseQueryResponse<A> : QueryResponse<A>
		}

		return {
			$cache: new Map() as CacheMap,
			$refetch: <A extends AsyncFunction>(
				queryFn: A,
				args = [] as unknown as Parameters<A>
			): Promise<Awaited<ReturnType<A>>> => refetchQuery(queryFn, args, serialaze(args)),
			$invalidate<A extends AsyncFunction>(
				queryFn: A,
				args = [] as unknown as Parameters<A>,
				data?: Awaited<ReturnType<A>>
			) {
				if (data) setCache(queryFn, serialaze(args), { data, loading: false })
				else void refetchQuery(queryFn, args, serialaze(args))
			},
			$suspenseQuery: <A extends AsyncFunction>(
				queryFn: A,
				args = [] as unknown as Parameters<A>,
				queryInit?: QueryInit
			) => executeQuery(true, queryFn, args, queryInit),
			$query: <A extends AsyncFunction>(
				queryFn: A,
				args = [] as unknown as Parameters<A>,
				queryInit?: QueryInit
			) => executeQuery(false, queryFn, args, queryInit)
		}
	}
