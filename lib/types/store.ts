import type { CacheMap } from './cache'
import type { QueryResponse } from './query-response'
import type { AsyncFunction as AsyncFn } from './utils'

export interface QueryCache {
	cache: CacheMap
	invalidate: <A extends AsyncFn>(queryFn: A, args: Parameters<A>) => void
	useSuspendedQuery: <A extends AsyncFn>(queryFn: A, args: Parameters<A>) => Awaited<ReturnType<A>>
	useQuery: <A extends AsyncFn>(queryFn: A, args: Parameters<A>) => QueryResponse<A>
}

export type ZustandQueries = QueryCache
