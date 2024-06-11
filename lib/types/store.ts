import type { ExtractQuery, Queries, QueryConfig, QueryStore } from './query-config'
import type { QueryResponse } from './query-response'
import type { AsyncFunction, Stringified } from './utils'

export interface QueryCache<T extends Queries> {
	cache: Map<
		keyof T,
		Map<
			Stringified<Parameters<ExtractQuery<T[keyof T]>>>,
			Awaited<ReturnType<ExtractQuery<T[keyof T]>>>
		>
	>
	invalidate: (query: keyof T, args: Parameters<ExtractQuery<T[keyof T]>>) => void
	update: (query: keyof T, args: Parameters<ExtractQuery<T[keyof T]>>) => void
}

type QueryAction<F extends AsyncFunction> = (...args: Parameters<F>) => QueryResponse<F>

type SuspensedQueryAction<F extends AsyncFunction> = (
	...args: Parameters<F>
) => Awaited<ReturnType<F>>

type QueryActions<T extends QueryStore> = {
	[key in keyof T['queries']]: T['suspense'] extends true
		? T['queries'][key] extends QueryConfig
			? T['queries'][key]['suspense'] extends false
				? QueryAction<ExtractQuery<T['queries'][key]>>
				: SuspensedQueryAction<ExtractQuery<T['queries'][key]>>
			: SuspensedQueryAction<ExtractQuery<T['queries'][key]>>
		: T['queries'][key] extends QueryConfig
			? T['queries'][key]['suspense'] extends true
				? SuspensedQueryAction<ExtractQuery<T['queries'][key]>>
				: QueryAction<ExtractQuery<T['queries'][key]>>
			: QueryAction<ExtractQuery<T['queries'][key]>>
}

type MutationActions<T extends QueryStore> = {
	[key in keyof T['mutations']]: T['mutations'][key]
}

export type ZustandQueries<S extends QueryStore> = QueryCache<S['queries']> &
	QueryActions<S> &
	MutationActions<S>
