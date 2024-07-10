import type { AsyncFunction } from './utils'

interface QueryResponseProto<A extends AsyncFunction> {
	/** Is query loading in progress */
	loading?: boolean

	/** `Promise` object, returned by async query function */
	promise: Promise<void>

	/** Manual start of query fetching */
	refetch: () => Promise<Awaited<ReturnType<A>>>
}

export interface SuspenseQueryResponse<A extends AsyncFunction> extends QueryResponseProto<A> {
	/** Successful query execution result */
	data: Awaited<ReturnType<A>>
}

export interface QueryResponse<A extends AsyncFunction> extends QueryResponseProto<A> {
	/** Successful query execution result */
	data?: Awaited<ReturnType<A>>

	/** Error description of query fetching failure */
	error?: any
}
