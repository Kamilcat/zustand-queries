import type { CacheMap } from './cache'
import { QueryInit } from './query-config'
import type { QueryResponse, SuspenseQueryResponse } from './query-response'
import type { AsyncFunction } from './utils'

export interface QueryCache {
	/** Query cache, contained in Map object */
	cache: CacheMap

	refetch: <A extends AsyncFunction>(
		queryFn: A,
		args?: Parameters<A>
	) => Promise<Awaited<ReturnType<A>>>

	/**
	 * Invalidate query result for provided arguments:
	 * previous result will be deleted and replaced
	 * with a new one
	 */
	invalidate: <A extends AsyncFunction>(
		queryFn: A,
		args?: Parameters<A>,
		newData?: Awaited<ReturnType<A>>
	) => void

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
	) => SuspenseQueryResponse<A>
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
