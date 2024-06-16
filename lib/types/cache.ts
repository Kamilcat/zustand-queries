import type { QueryResponse } from './query-response'
import type { AsyncFunction, Stringified } from './utils'

export type CacheRecord<A extends AsyncFunction> = Map<Stringified<Parameters<A>>, QueryResponse<A>>

export interface CacheMap extends Map<AsyncFunction, CacheRecord<AsyncFunction>> {
	clear(): void
	delete(key: AsyncFunction): boolean
	forEach<A extends AsyncFunction>(
		callbackfn: (value: CacheRecord<A>, key: A, map: CacheMap) => void,
		thisArg?: any
	): void
	get<A extends AsyncFunction>(key: A): CacheRecord<A> | undefined
	has(key: AsyncFunction): boolean
	set<A extends AsyncFunction>(key: A, value: CacheRecord<A>): this
	readonly size: number
}

export interface CacheMapConstructor extends MapConstructor {
	new (entries?: readonly (readonly [AsyncFunction, CacheRecord<AsyncFunction>])[] | null): CacheMap
}
