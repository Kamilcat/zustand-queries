import type { AsyncFunction } from './utils'

export type QueryResponse<A extends AsyncFunction> = {
	loading?: boolean
	promise: Promise<void>
	data?: Awaited<ReturnType<A>>
	error?: any
	refetch: () => Promise<Awaited<ReturnType<A>>>
}
