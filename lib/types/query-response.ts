import type { XOR } from 'ts-xor'
import type { AsyncFunction } from './utils'

interface PendingQueryResponse {
	isLoading: boolean
}

interface SuccessQueryResponse<R extends AsyncFunction> extends PendingQueryResponse {
	data: Awaited<ReturnType<R>>
	isSuccess: true
}

interface ErrorQueryResponse extends PendingQueryResponse {
	error: any
	isError: true
}

export type QueryResponse<R extends AsyncFunction> = XOR<
	SuccessQueryResponse<R>,
	ErrorQueryResponse
>
