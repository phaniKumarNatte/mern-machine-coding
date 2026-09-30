What is infinite scrolling, and how does it differ from traditional pagination on the frontend?
Why use `page` and `limit` query params instead of returning all products at once?
How did you calculate `start` and `end` for slicing — walk through the math for page 3, limit 10?
Why return a `hasMore` boolean instead of letting the frontend guess if there's more data?
What happens if the client requests a `page` or `limit` that isn't a number, or is negative or zero?
What happens if `page` is way beyond the last page (e.g. page 999)?
Why use array index-based ids (`String(index + 1)`) instead of real database ids — what problem would that cause with a real database?
This uses offset-based pagination (skip/limit). What is cursor-based pagination, and why do large systems (Twitter, Instagram) prefer it?
What's the problem with offset-based pagination when items are inserted or deleted while the user is scrolling?
Why is the data stored in memory here, and what would change if it came from MongoDB instead?
How would you implement this same endpoint with MongoDB using `.skip()` and `.limit()`, and what performance issue does `.skip()` have on large collections?
How would you convert this to cursor-based pagination (e.g. using the last item's id or a timestamp as the cursor)?
Why is CORS enabled here, and what does `app.use(cors())` actually do?
How would the frontend know when to trigger the next page fetch (e.g. `IntersectionObserver`, scroll event listener)?
What happens if the frontend fires multiple "load more" requests before the previous one resolves — how would you prevent duplicate/out-of-order pages appending?
How would you add sorting or filtering to this API without breaking pagination?
How would you scale this if the dataset had millions of products instead of 47?
What are the tradeoffs between infinite scroll and traditional "Next/Previous" pagination from a UX and performance perspective?
