npm init -y
npm install -D typescript tsx @types/node

                Client
                  |
                  ↓
          Express.js API
                  |
                  ↓
             Cache Layer
             /        \
          HIT          MISS
           |             |
           ↓             ↓
      Return data     MongoDB
                         |
                         ↓
                  Store in Cache
                         |
                         ↓
                    Return data

npm install express redis mongoose
npm install -D @types/express

What happens if Redis is down — does your API still work?
What happens if Redis is slow — does it block the response?
Why use Redis instead of just querying MongoDB directly?
What is the cache-aside pattern, and how does it differ from write-through/write-behind?
What is TTL, and how did you choose 60 seconds for this project?
What is cache invalidation, and why did you invalidate on PUT/DELETE instead of just letting TTL expire?
What is a cache stampede, and could it happen here if this key gets thousands of requests/sec right as it expires?
What is cache penetration, and does your code handle a request for an id that never exists in MongoDB?
What is cache eviction, and what eviction policy would you configure in Redis (e.g. maxmemory-policy)? 
## If you run multiple Node.js server instances, how do they share the same cache?
ans : When we run multiple Node.js instances, I would use a centralized Redis cache. All Node.js servers connect to the same Redis instance or Redis cluster, so regardless of which server receives the request, it can access the same cache. This avoids separate in-memory caches on each server and helps maintain consistent cached data
                Load Balancer
                 /    |    \
                ↓     ↓     ↓
          Node.js  Node.js  Node.js
          Server 1 Server 2 Server 3
              \      |      /
               \     |     /
                  Redis
              Central Cache
                   |
                MongoDB
                
What happens when the cached data becomes stale (e.g. updated directly in MongoDB by another service, bypassing your API)?
Why cache the whole product object as a JSON string instead of using a Redis hash?
What happens if JSON.parse fails on a corrupted cache value?
How would you handle a race condition where two requests both get a cache MISS at the same time and both hit MongoDB?
How would you monitor cache hit/miss ratio in production?
What's the difference between EX and PX in Redis, and between SET ... EX and EXPIRE?
Why use findByIdAndUpdate/findByIdAndDelete instead of findById + .save()/.remove()?
What would you change if the id in the URL wasn't guaranteed to be a valid MongoDB ObjectId?
