import type { AsyncFunction } from './utils'

export interface QueryInit {
	/** Query cache lifetime */
	lifetime?: number

	/** Automatically re-fetch query, when it's cache lifetime expired  */
	refetch?: boolean

	/** Re-try after catching error */
	retry?: boolean

	/** Return previous stale value, while fetching new one */
	stale?: boolean
}

export interface QueryConfig extends QueryInit {
	query: AsyncFunction
}

export type ExtractQuery<Q extends QueryConfig | AsyncFunction> = Q extends AsyncFunction
	? Q
	: Q extends QueryConfig
		? Q['query']
		: never

export type Queries = Record<string, AsyncFunction | QueryConfig>
export type Mutations = Record<string, AsyncFunction>

export interface QueryStore extends QueryInit {
	queries?: Queries
	mutations?: Mutations
}
