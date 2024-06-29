# Zustand Queries
Asynchronous server-state management for [Zustand](https://github.com/pmndrs/zustand) (React or Vanilla JS). TypeScript fully supported.

### Features
- Automatic cache control and invalidation
- Stale results while re-validating
- `Promise`-based queries
- Suspense mode for React's `<Suspense />`
- Comming soon: retries on errors, SSR support

## Installing
[Zustand](https://github.com/pmndrs/zustand) is peer dependency and required to be installed.

### NPM
```bash
npm install zustand-queries --save
```

## Getting started
Caching is based on using `async` functions or functions, which return `Promise`. Result of returned `Promise` is cached by function's arguments array as key.

### React/Preact
Cache storage initialization:
```js
import { create } from 'zustand'
import { createCache } from 'zustand-queries'

export const useCacheStore = create(createCache())
```

Example of API function, which fetches data from server and returns `Promise`:
```js
export const API = {
  getPostsByDate(startDate, endDate) {
    return fetch(`https://example.com/posts/?start=${startDate}&end=${endDate}`)
  }
}
```

Using in components:
```js
import { useCacheStore } from '...'
import { API } from '...'

function PostCard() {
  const { $query } = useCacheStore()

  // Result of API.getPostsByDate is cached with it's arguments array as key
  const { data, loading, error, refetch } = $query(API.getPostsByDate, ['12.10.2023', '01.07.2024'])

  if (loading) return <div>Loading...</div>

  if (error) throw new Error('Something went wrong')

  return (
    <div>
      <h2>Content of post №1754:</h2>
      <p>{ data }</p>
      <button onClick={refetch}>Update data</button>
    </div>
  )
}
```

React Suspense mode:
```js
import { useCacheStore } from '...'
import { API } from '...'

function SuspensedPostCard() {
  const { $suspenseQuery } = useCacheStore()

  const { data } = $suspenseQuery(API.getPostsByDate, ['12.10.2023', '01.07.2024'])

  return (
    <div>
      <h2>Content of post №1754:</h2>
      <p>{ data }</p>
      <button onClick={refetch}>Update data</button>
    </div>
  )
}
```
