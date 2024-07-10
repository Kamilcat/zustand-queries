import type { CacheMap } from './cache'
import { QueryInit } from './query-config'
import type { QueryResponse, SuspenseQueryResponse } from './query-response'
import type { AsyncFunction } from './utils'

export interface QueryCache {
	/** Query cache, contained in Map object */
	$cache: CacheMap

	/**
	 * Manual query fetch. Rejects if query wasn't created before with `$query`
	 * or `$suspenseQuery`
	 * @param queryFn Async query function
	 * @param args Array of query function arguments
	 * @returns Promise for query function result. Rejects if query doesn't exist
	 */
	$refetch: <A extends AsyncFunction>(
		queryFn: A,
		args?: Parameters<A>
	) => Promise<Awaited<ReturnType<A>> | void>

	/**
	 * Invalidate query result for provided arguments:
	 * previous result will be deleted and replaced
	 * with a new one. Does nothing if query wasn't created before
	 * with `$query` or `$suspenseQuery`
	 * @param queryFn Async query function
	 * @param args Array of query function arguments
	 * @param newData New data for cache
	 */
	$invalidate: <A extends AsyncFunction>(
		queryFn: A,
		args?: Parameters<A>,
		newData?: Awaited<ReturnType<A>>
	) => void

	/**
	 * Get cached query result for provided arguments, if found.
	 * Otherwise executes async function with throwing `Promise` to parent component
	 * and caches it's result when `Promise` is resolved
	 * @param queryFn Async query function
	 * @param args Array of query function arguments
	 * @param queryInit Custom query configuration
	 * @returns Cached query result (if loading in progress, throws `Promise` to parent component)
	 */
	$suspenseQuery: <A extends AsyncFunction>(
		queryFn: A,
		args?: Parameters<A>,
		queryInit?: QueryInit
	) => SuspenseQueryResponse<A>
	/**
	 * Get cached query result for provided arguments, if found.
	 * Otherwise executes async function and caches it's result when `Promise` is resolved
	 * @param queryFn Async query function
	 * @param args Array of query function arguments
	 * @param queryInit Custom query configuration
	 * @returns Cached query result
	 */
	$query: <A extends AsyncFunction>(
		queryFn: A,
		args?: Parameters<A>,
		queryInit?: QueryInit
	) => QueryResponse<A>
}

export type ZustandQueries = QueryCache
