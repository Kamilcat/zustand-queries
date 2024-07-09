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
		let timers = new WeakMap<() => Promise<any>, [timerID: number, delay: number]>()

		// @ts-expect-error
		let serialaze: <Args extends any[]>(args: Args) => Stringified<Args> = JSON.stringify

		let updateState = () => set(({ $cache }) => ({ $cache: new Map($cache) as CacheMap }))

		let getCache = <A extends AsyncFunction>(queryFn: A): CacheRecord<A> =>
			get().$cache.get(queryFn) ?? get().$cache.set(queryFn, new Map()).get(queryFn)!

		let setCache = <A extends AsyncFunction>(
			queryFn: A,
			queryArgs: Stringified<Parameters<A>>,
			newState: Partial<QueryResponse<A>>
		) => {
			let queryCache = getCache(queryFn)
			let queryResult = queryCache.get(queryArgs)!
			let oldTimer = timers.get(queryResult.refetch)!
			if (oldTimer[0]) clearTimeout(oldTimer[0])
			queryCache.set(queryArgs, { ...queryResult, ...newState })
			oldTimer[0] = setTimeout(() => {
				queryCache.delete(queryArgs)
				updateState()
			}, oldTimer[1]) as unknown as number
			updateState()
		}

		let refetchQuery = <A extends AsyncFunction>(
			queryFn: A,
			args = [] as unknown as Parameters<A>,
			queryArgs: Stringified<Parameters<A>>
		): Promise<Awaited<ReturnType<A>>> => {
			let promise = queryFn.apply(null, args).then(
				(data: Awaited<ReturnType<typeof queryFn>>) => (
					setCache(queryFn, queryArgs, { data, loading: false }), data
				),
				(error: unknown) => setCache(queryFn, queryArgs, { error, loading: false })
			)
			setCache(queryFn, queryArgs, { promise, loading: true })
			return promise as Promise<Awaited<ReturnType<A>>>
		}

		let executeQuery = <A extends AsyncFunction, S extends boolean>(
			suspense: S,
			queryFn: A,
			args = [] as unknown as Parameters<A>,
			queryInit?: QueryInit
		) => {
			let queryConfig = queryInit
				? (Object.setPrototypeOf(queryInit, queryStoreProto) as QueryInit)
				: (queryStoreProto as QueryInit)

			let queryCache = getCache(queryFn)
			let queryArgs = serialaze(args)
			if (!queryCache.has(queryArgs)) {
				let refetch = () => refetchQuery(queryFn, args, queryArgs)
				queryCache.set(queryArgs, { promise: Promise.resolve(), refetch })
				timers.set(refetch, [0, queryConfig.lifetime!])
				if (queryConfig.autofetch) void refetch()
			}
			let queryResult = queryCache.get(queryArgs)!
			if (suspense) {
				if ('error' in queryResult) throw queryResult.error
				if (!('data' in queryResult)) throw queryResult.promise
			}
			return queryResult as S extends true ? SuspenseQueryResponse<A> : QueryResponse<A>
		}

		return {
			$cache: new Map() as CacheMap,
			$refetch<A extends AsyncFunction>(
				queryFn: A,
				args = [] as unknown as Parameters<A>
			): Promise<Awaited<ReturnType<A>>> {
				let queryArgs = serialaze(args)
				return getCache(queryFn).has(queryArgs)
					? refetchQuery(queryFn, args, queryArgs)
					: Promise.reject(new Error('query not found'))
			},
			$invalidate<A extends AsyncFunction>(
				queryFn: A,
				args = [] as unknown as Parameters<A>,
				data?: Awaited<ReturnType<A>>
			) {
				let queryArgs = serialaze(args)
				if (getCache(queryFn).has(queryArgs)) {
					if (data) setCache(queryFn, queryArgs, { data, loading: false })
					else void refetchQuery(queryFn, args, queryArgs)
				}
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
