/** Utility types */
declare const ___stringified: unique symbol

export declare class Stringified<T extends any[]> extends String {
	private [___stringified]: T
}

export type AsyncFunction = (...args: any[]) => Promise<any>

export type MapValueType<A> = A extends Map<any, infer V> ? V : never
