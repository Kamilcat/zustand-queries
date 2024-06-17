import type { CacheMap } from './cache'
import type { QueryInit, QueryStore } from './query-config'
import type { QueryResponse } from './query-response'
import type { AsyncFunction } from './utils'

export interface QueryCache<C extends QueryInit> {
	cache: CacheMap
	invalidate: <A extends AsyncFunction>(queryFn: A, args?: Parameters<A>) => void
	update: <A extends AsyncFunction>(queryFn: A, args?: Parameters<A>) => void
	useQuery: <A extends AsyncFunction>(
		queryFn: A,
		args?: Parameters<A>
	) => C['suspense'] extends true ? Awaited<ReturnType<A>> : QueryResponse<A>
}

// type QueryAction<F extends AsyncFunction> = (...args: Parameters<F>) => QueryResponse<F>

// type SuspensedQueryAction<F extends AsyncFunction> = (
// 	...args: Parameters<F>
// ) => Awaited<ReturnType<F>>

// export type QueryActions<T extends QueryStore> = {
// 	[key in keyof T['queries']]: T['suspense'] extends true
// 		? T['queries'][key] extends QueryConfig
// 			? T['queries'][key]['suspense'] extends false
// 				? QueryAction<ExtractQuery<T['queries'][key]>>
// 				: SuspensedQueryAction<ExtractQuery<T['queries'][key]>>
// 			: SuspensedQueryAction<ExtractQuery<T['queries'][key]>>
// 		: T['queries'][key] extends QueryConfig
// 			? T['queries'][key]['suspense'] extends true
// 				? SuspensedQueryAction<ExtractQuery<T['queries'][key]>>
// 				: QueryAction<ExtractQuery<T['queries'][key]>>
// 			: QueryAction<ExtractQuery<T['queries'][key]>>
// }

// export type MutationActions<T extends QueryStore> = {
// 	[key in keyof T['mutations']]: T['mutations'][key]
// }

export type ZustandQueries<S extends QueryStore> = QueryCache<S>
