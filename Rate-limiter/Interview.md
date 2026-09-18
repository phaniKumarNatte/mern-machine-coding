                  Client
                    |
                    ↓
              Load Balancer
                    |
          ┌─────────┴─────────┐
          ↓                   ↓
     Node Server 1       Node Server 2
          |                   |
          └─────────┬─────────┘
                    ↓
                  Redis
                    |
                    ↓
              Request count


src/
 ├── config/
 │    └── redis.ts
 ├── middleware/
 │    └── rateLimiter.ts
 └── app.ts


 

Rate Limiter
     |
     ├── Identify client
     |      └── IP / userId / API key
     |
     ├── Count requests
     |
     ├── Time window
     |
     ├── Check limit
     |
     ├── Allow → next()
     |
     └── Reject → 429

npm install redis


Interview Questions
===================

Project Understanding
---------------------

1. What problem does this rate limiter solve?
2. Explain the request flow from the client to Redis in this project.
3. Why is Redis used instead of an in-memory JavaScript object?
4. Why must the request count be stored in a shared system when Node Server 1 and Node Server 2 are behind a load balancer?
5. What is the responsibility of `rateLimiter(maxRequests, windowSeconds)`?
6. How are different limits configured for login, OTP, and products?
7. What is the purpose of the `/health` endpoint?
8. What happens when the Redis connection cannot be established during startup?

Middleware and Express
----------------------

9. Why is `rateLimiter(5, 60)` called while configuring the route instead of inside every request handler?
10. What are `req`, `res`, and `next` in this middleware?
11. What happens when `next()` is called?
12. What happens when the request count is greater than `maxRequests`?
13. Why does the middleware call `next(error)` inside the `catch` block?
14. What would happen if `next()` were called after sending the `429` response?
15. Why are the rate limiter middleware routes registered before the endpoint handlers?
16. How would you add an Express error-handling middleware for Redis errors?
17. Why does the project export `app` as the default export even though it starts the server in the same file?
18. How would you separate app creation and server startup for easier testing?

Redis and Rate-Limiting Logic
-----------------------------

19. What does `redisClient.incr(key)` do when the key does not already exist?
20. Why is `expire(key, windowSeconds)` called only when `count === 1`?
21. What happens if `expire` is called on every request instead of only the first request?
22. What does the current algorithm mean by a fixed window?
23. When does the request counter reset?
24. What response status and JSON body does a client receive after exceeding the limit?
25. Why is the Redis key prefixed with `rate-limit:`?
26. Why is `req.baseUrl` included in the Redis key?
27. What would happen if the route name were not included in the key?
28. What is the purpose of the fallback value `"unknown"` for `req.ip`?
29. Is the `INCR` followed by `EXPIRE` fully atomic? What failure could occur between these two commands?
30. How could you prevent a key from remaining without an expiration if the process fails between `INCR` and `EXPIRE`?
31. How would you implement the increment and expiration using a Redis transaction or Lua script?
32. What happens when multiple requests increment the same key at the same time?
33. Can the current implementation allow a burst of requests at the end of one window and another burst at the beginning of the next window?
34. How would a sliding-window rate limiter differ from this implementation?
35. How would you implement a token-bucket rate limiter with Redis?

Client Identity and Security
----------------------------

36. Is IP address a reliable identity for every rate-limiting use case?
37. What problems can occur when many users share one public IP address?
38. How can the limiter identify a user by `userId` after authentication?
39. How could the limiter use an API key instead of an IP address?
40. What security risk exists when the application trusts proxy headers without configuring Express proxies correctly?
41. How would you configure the application when it runs behind the load balancer shown above?
42. How could an attacker bypass IP-based limiting through many proxy addresses?
43. Should login and OTP limits be based on the user, IP, account, or a combination? Explain your choice.
44. What information should be included in logs when a request receives a `429` response?

Configuration and Redis Compatibility
-------------------------------------

45. Why is `dotenv/config` imported before the Redis client is created?
46. What is the fallback Redis URL when `REDIS_URL` is missing?
47. What is the purpose of `process.env.PORT ?? 3000`?
48. Why is the port converted with `Number()`?
49. Why is `RESP: 2` configured in this project?
50. What error would occur if the connected Redis-compatible server did not support the default RESP3 `HELLO` command?
51. Why are `connectTimeout` and `reconnectStrategy: false` configured?
52. Should the application fail to start when Redis is unavailable, or should it fail open and allow requests? Discuss the tradeoff.
53. How would you configure Redis authentication and TLS for production?
54. How would you avoid logging sensitive Redis connection details?

Testing and Debugging
---------------------

55. How would you test that the login route allows five requests and rejects the sixth?
56. How would you test that OTP and login have independent counters?
57. How would you test that the counter expires after the configured window?
58. How would you test the middleware without starting an HTTP server?
59. How would you mock `redisClient.incr` and `redisClient.expire` in a unit test?
60. What would you check if every request returns a Redis error?
61. What would you check if the health endpoint works but protected routes return errors?
62. How would you inspect the generated Redis key while debugging?
63. How would you test the application when Redis is running on another host?
64. What metrics would you add to confirm that rate limiting works in production?

Improvements and Design Discussion
----------------------------------

65. How would you return the remaining request count to the client?
66. Which HTTP headers could communicate the limit and retry time?
67. How would you calculate and return a `Retry-After` header?
68. How would you make the limits configurable without changing `app.ts`?
69. How would you support different limits for authenticated and unauthenticated users?
70. How would you add a global fallback rate limiter in addition to route-specific limits?
71. How would you handle Redis latency or a temporary Redis outage for a high-traffic endpoint?
72. How would you clean up old rate-limit keys?
73. How would you prevent key collisions between environments such as development and production?
74. How would you add a namespace containing the application name and environment to every Redis key?
75. How would you scale this project across multiple application instances and multiple regions?
76. What are the limitations of using `req.baseUrl` as part of the identity of a rate-limit bucket?
77. How would you change the design if the product requirement were 100 requests per minute per user, not per IP?
78. How would you document the rate limits for API consumers?