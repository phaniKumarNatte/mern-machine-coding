1. Basic TinyURL Questions
These are very likely if your project is on your resume.

What is TinyURL and how does a URL shortener work?
Explain the complete flow when a user enters a long URL.
How do you generate the shortened URL?
How do you ensure that two different URLs don't get the same short code?
How do you redirect a user from a short URL to the original URL?
Why did you choose MongoDB for this project?
What would your MongoDB document look like?
How do you handle expired URLs?
How do you handle invalid or non-existent short URLs?
How do you count the number of clicks on a shortened URL?
A typical document might look like:

{
  originalUrl: "https://example.com/some/very/long/url",
  shortCode: "aB91xK",
  createdAt: Date,
  expiresAt: Date,
  clicks: 125
}

2. Short Code Generation
Interviewers often go deeper here.

Question: How would you generate the short code?
You should be able to explain multiple approaches:

Random string generation
Hashing the original URL
Auto-incrementing numeric ID + Base62 encoding
UUID-based approaches

Why Base62?
Why not use the MongoDB _id directly?
What happens if the randomly generated code already exists?
How many URLs can a 6-character Base62 code represent?

APIs
Q: What APIs would you create for TinyURL?

For example:

POST   /api/urls
GET    /:shortCode
GET    /api/urls/:shortCode
DELETE /api/urls/:shortCode

Then they may ask:

What happens inside GET /:shortCode?

Middleware
They may ask:

What is middleware in Express?
How do you create custom middleware?
Where would you use authentication middleware?
How would you implement error-handling middleware?
What is the difference between application-level and route-level middleware?
Example:

app.use(express.json());

app.use((err, req, res, next) => {
  console.error(err);

  res.status(500).json({
    message: "Internal Server Error"
  });
});


4. MongoDB Questions
These are especially important for your project.

Basic
Why MongoDB instead of MySQL/PostgreSQL?
What is a collection?
What is a document?
What is an index?
What indexes would you create for TinyURL?
What is the difference between findOne() and find()?
What is MongoDB aggregation?
What is a TTL index?
Very relevant question:
How would you optimize lookup by short URL?

You should say:

Since every redirect requires searching by shortCode, I would create a unique index on shortCode.

For example:

shortCode: {
  type: String,
  required: true,
  unique: true,
  index: true
}

This is a good interview point

5. TTL / Expiration Questions
A good interviewer may ask:

Suppose URLs should expire after 7 days. How would you implement this?

You can explain MongoDB TTL indexes.

For example:

expiresAt: {
  type: Date,
  index: {
    expireAfterSeconds: 0
  }
}

Then MongoDB can automatically remove expired documents.

But there's an important distinction:

Deletion and redirection behavior are separate concerns.

Your application should still ensure an expired URL isn't redirected if expiration is part of your business logic.

6. React Questions
If you have a frontend for TinyURL, expect questions like:

How did you structure your React application?
Which components did you create?
How did you manage state?
Did you use Context API or Redux?
How did you call your backend APIs?
How did you handle loading states?
How did you handle API errors?
How did you validate URLs?
How did you display click statistics?
How did you prevent unnecessary API calls?
They may ask:

What happens when the user clicks "Shorten URL"?

You should explain the frontend → backend flow:

React form
   ↓
Validation
   ↓
Axios/Fetch
   ↓
POST /api/urls
   ↓
Express
   ↓
Controller
   ↓
MongoDB
   ↓
Response
   ↓
React state update
   ↓
Display short URL


7. Authentication Questions
If your TinyURL application has login/signup, expect:

How did you implement authentication?
Why JWT?
Where do you store the JWT?
What is the difference between access token and refresh token?
How do you protect an API?
How do you hash passwords?
Why shouldn't you store passwords directly?
What is bcrypt?
How do you associate URLs with users?
For example:

{
  originalUrl: "...",
  shortCode: "aB91xK",
  userId: ObjectId("...")
}

Then:

A user can see/manage only the URLs belonging to their account.


8. Security Questions
These can separate a junior candidate from a strong candidate.

Expect:

"What security issues can a URL shortener have?"
You can mention:

XSS
NoSQL injection
Open redirect abuse
Malicious URLs
Rate limiting
Brute-force short-code scanning
Authentication vulnerabilities
CORS configuration
Input validation
SSRF-related concerns depending on what the backend does with URLs
Important:
If your server only stores and redirects URLs, it generally should not make an HTTP request to the submitted URL just to validate that it exists.

9. System Design Questions
For a mid-level MERN interview, these are very important.

"How would you design TinyURL for 1 million users?"

                ┌──────────────┐
                │    Client    │
                └──────┬───────┘
                       │
                       ▼
                ┌──────────────┐
                │ Load Balancer│
                └──────┬───────┘
                       │
          ┌────────────┴────────────┐
          ▼                         ▼
   ┌─────────────┐           ┌─────────────┐
   │ Node Server │           │ Node Server │
   └──────┬──────┘           └──────┬──────┘
          │                         │
          └──────────┬──────────────┘
                     ▼
              ┌─────────────┐
              │    Redis    │
              └──────┬──────┘
                     │
                     ▼
              ┌─────────────┐
              │   MongoDB   │
              └─────────────┘

10. Redis Questions
If you mention Redis in your project, be prepared for follow-ups.

Q: Why Redis?
Because URL redirects can be extremely read-heavy.

For example:

GET /abc123
       ↓
Redis
       ↓
Found?
  ↓ YES
Redirect immediately

If not found:

Redis
   ↓
MongoDB
   ↓
Store result in Redis
   ↓
Redirect

Then expect:

What is caching?
What is cache-aside?
What is cache invalidation?
What happens when Redis goes down?
How long should a URL remain cached?
What is Redis TTL?
Why not store everything in Redis?

11. Performance Questions
Very common:

"How would you improve the performance of your TinyURL application?"
Good answer points:

Add MongoDB indexes.
Cache popular URLs using Redis.
Keep Node.js servers stateless.
Use connection pooling.
Add rate limiting.
Use pagination for analytics.
Move heavy analytics processing to background jobs.
Use a CDN where appropriate.
Compress API responses where beneficial.
Monitor database query performance.


12. Concurrency Questions
This is a great interview trap.

Question:
What happens if 1,000 users request a short URL at exactly the same time?

You should discuss:

Unique index on shortCode
Atomic database operations where needed
Avoiding race conditions
Caching
Database connection pooling
Rate limiting
Another question:

Two requests generate the same short code. What happens?

Your database should enforce uniqueness:

shortCode: {
  type: String,
  unique: true
}

If a collision occurs, catch the duplicate-key error and generate another code.

13. Click Counter Questions
They might ask:

Every time someone visits a short URL, you increment clicks. Is that scalable?

A naive implementation:

url.clicks += 1;
await url.save();

isn't ideal under heavy concurrent traffic.

You could use an atomic update:

await Url.findOneAndUpdate(
  { shortCode },
  { $inc: { clicks: 1 } }
);

At very high scale, you could move analytics into an event/queue-based system rather than making every redirect wait for analytics persistence.


15. Advanced TinyURL Questions
If the interviewer wants to test system-design knowledge:

Q: How would you prevent short-code collisions?
Answer:

Generate code
      ↓
Unique DB constraint
      ↓
Collision?
   /      \
 Yes      No
  ↓        ↓
Generate   Save
again

Q: How would you support custom aliases?
Example:

myurl.com/github

instead of:

myurl.com/a7X92k

You'd validate:

Allowed characters
Length
Reserved words
Uniqueness
Q: How would you support 10 billion URLs?
Now you should discuss:

Distributed databases
Sharding
Multiple application servers
Redis/cache layer
Load balancing
ID generation strategy
Analytics architecture
Database partitioning
Monitoring
Failure recovery


16. DevOps Questions
Depending on the job, you may get:

How did you deploy your MERN application?
What is Docker?
How would you Dockerize Node.js?
What environment variables do you use?
How do you manage secrets?
What is CI/CD?
How would you deploy React + Node + MongoDB?
What happens if your Node server crashes?
How do you monitor production errors?
