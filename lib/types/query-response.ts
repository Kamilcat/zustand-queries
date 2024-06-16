import type { XOR } from 'ts-xor'
import type { AsyncFunction } from './utils'

export interface PendingQueryResponse {
	isLoading: boolean
	promise: Promise<void>
}

interface SuccessQueryResponse<A extends AsyncFunction> extends PendingQueryResponse {
	data: Awaited<ReturnType<A>>
	isSuccess: true
}

interface ErrorQueryResponse extends PendingQueryResponse {
	error: any
	isError: true
}

export type QueryResponse<A extends AsyncFunction> = XOR<
	SuccessQueryResponse<A>,
	ErrorQueryResponse
>
