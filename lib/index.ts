import type { StateCreator } from 'zustand'
import type { CacheMap, CacheRecord } from './types/cache'
import type { QueryInit } from './types/query-config'
import type { QueryResponse, SuspenseQueryResponse } from './types/query-response'
import type { ZustandQueries } from './types/store'
import { AsyncFunction, Stringified } from './types/utils'

export type { QueryInit, QueryResponse, SuspenseQueryResponse, ZustandQueries }

export function createCache(queryStoreInit?: QueryInit): StateCreator<ZustandQueries> {
	/** Merge query configuration objects */
	let mergeConfigs = (firstObj: QueryInit, secondObj?: QueryInit): QueryInit =>
		secondObj ? (Object.setPrototypeOf(secondObj, firstObj) as QueryInit) : firstObj

	/** Basic query configuration */
	let queryStoreProto = mergeConfigs(
		{
			autofetch: true,
			lifetime: 300000
		} as QueryInit,
		queryStoreInit
	)

	return (set, get) => {
		/** Lifetime timers for cache records */
		let timers = new WeakMap<() => Promise<any>, [timerID: number, delay: number]>()

		/**
		 * Serialize function arguments array to string
		 * with keeping original array type in mind
		 */
		// @ts-expect-error
		let serialize: <Args extends any[]>(args: Args) => Stringified<Args> = JSON.stringify

		/** Force Zustand's store state update */
		let updateState = () => set(({ $cache }) => ({ $cache: new Map($cache) as CacheMap }))

		/**
		 * Get cache record for provided async query function.
		 * Cache record is `Map` object of stringified function argument
		 * paired with results for those arguments
		 * @param queryFn Async query function
		 * @returns Cache record for query function (`Map` object)
		 */
		let getCache = <A extends AsyncFunction>(queryFn: A): CacheRecord<A> =>
			get().$cache.get(queryFn) ?? get().$cache.set(queryFn, new Map()).get(queryFn)!

		/**
		 * Update cache record for provided async function
		 * with specific arguments set.
		 * Cache record for query must be created by `createQuery`
		 * before call of `setCache`
		 * @param queryFn Async query function
		 * @param queryArgs Stringified function arguments
		 * @param newState New cache record
		 */
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

		/**
		 * Manual query fetch
		 * @param queryFn Async query function
		 * @param args Array of query function arguments
		 * @param queryArgs Stringified function arguments
		 * @returns Promise for query result
		 */
		let fetchQuery = <A extends AsyncFunction>(
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

		/**
		 * Create a query for provided async function with specific argument set
		 * @param suspense Is React suspense-mode enabled
		 * @param queryFn Async query function
		 * @param args Array of query function arguments
		 * @param queryInit Query configuration
		 * @returns Query response object
		 */
		let createQuery = <A extends AsyncFunction, S extends boolean>(
			suspense: S,
			queryFn: A,
			args = [] as unknown as Parameters<A>,
			queryInit?: QueryInit
		) => {
			let queryConfig = mergeConfigs(queryStoreProto, queryInit)
			let queryCache = getCache(queryFn)
			let queryArgs = serialize(args)
			if (!queryCache.has(queryArgs)) {
				let refetch = () => fetchQuery(queryFn, args, queryArgs)
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
			): Promise<Awaited<ReturnType<A>> | void> {
				let queryArgs = serialize(args)
				return getCache(queryFn).has(queryArgs)
					? fetchQuery(queryFn, args, queryArgs)
					: Promise.reject(new Error('query not found'))
			},
			$invalidate<A extends AsyncFunction>(
				queryFn: A,
				args = [] as unknown as Parameters<A>,
				data?: Awaited<ReturnType<A>>
			) {
				let queryArgs = serialize(args)
				if (getCache(queryFn).has(queryArgs)) {
					if (data) setCache(queryFn, queryArgs, { data, loading: false })
					else void fetchQuery(queryFn, args, queryArgs)
				}
			},
			$suspenseQuery: <A extends AsyncFunction>(
				queryFn: A,
				args = [] as unknown as Parameters<A>,
				queryInit?: QueryInit
			) => createQuery(true, queryFn, args, queryInit),
			$query: <A extends AsyncFunction>(
				queryFn: A,
				args = [] as unknown as Parameters<A>,
				queryInit?: QueryInit
			) => createQuery(false, queryFn, args, queryInit)
		}
	}
}
