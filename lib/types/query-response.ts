import type { AsyncFunction } from './utils'

interface QueryResponseProto<A extends AsyncFunction> {
	loading?: boolean
	promise: Promise<void>
	refetch: () => Promise<Awaited<ReturnType<A>>>
}

export interface SuspenseQueryResponse<A extends AsyncFunction> extends QueryResponseProto<A> {
	data: Awaited<ReturnType<A>>
}

export interface QueryResponse<A extends AsyncFunction> extends QueryResponseProto<A> {
	data?: Awaited<ReturnType<A>>
	error?: any
}
