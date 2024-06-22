import type { CacheMap } from './cache'
import { QueryInit } from './query-config'
import type { QueryResponse } from './query-response'
import type { AsyncFunction } from './utils'

export interface QueryCache {
	/** Query cache, contained in Map object */
	cache: CacheMap

	/**
	 * Invalidate query result for provided arguments:
	 * previous result will be deleted and replaced
	 * with a new one
	 */
	invalidate: <A extends AsyncFunction>(queryFn: A, args?: Parameters<A>) => void

	/**
	 * Get cached query result for provided arguments, if found.
	 * Otherwise runs Promise and caches it result
	 * @param queryFn query function, which returns `Promise` object
	 * @param args array of query function arguments
	 * @param queryInit custom query configuration
	 * @returns cached query result or throws suspense to parent component
	 */
	useSuspendedQuery: <A extends AsyncFunction>(
		queryFn: A,
		args?: Parameters<A>,
		queryInit?: QueryInit
	) => Awaited<ReturnType<A>>

	/**
	 * Get cached query result for provided arguments, if found.
	 * Otherwise runs Promise and caches it result
	 * @param queryFn query function, which returns `Promise` object
	 * @param args array of query function arguments
	 * @param queryInit custom query configuration
	 * @returns cached query result
	 */
	useQuery: <A extends AsyncFunction>(
		queryFn: A,
		args?: Parameters<A>,
		queryInit?: QueryInit
	) => QueryResponse<A>
}

export type ZustandQueries = QueryCache
