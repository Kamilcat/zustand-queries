export interface QueryInit {
	/** Query cache lifetime
	 * @default 300000
	 */
	lifetime?: number

	/** Automatically re-fetch query, when it's cache lifetime expired
	 * @default false
	 */
	refetch?: boolean

	/** Re-try after catching error */
	retry?: boolean

	/** Return previous stale value, while fetching new one
	 * @default false
	 */
	stale?: boolean

	/** Automatically fetch query
	 * @default true
	 */
	autofetch?: boolean
}
