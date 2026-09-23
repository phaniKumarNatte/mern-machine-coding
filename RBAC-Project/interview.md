What is RBAC (Role-Based Access Control), and how does it differ from ABAC or ACL-based authorization?
Walk through what happens end-to-end from a user submitting the login form to landing on the dashboard — every request, token, and storage step involved.
Why is the password hashed with bcrypt before saving, and what does the `saltRounds` value of 10 actually control? What happens if you increase it to 20?
Why compare passwords with `bcrypt.compare()` instead of hashing the submitted password and checking equality against the stored hash?
The JWT secret falls back to a hardcoded string (`"super-secret-key-for-rbac"`) when `process.env.JWT_SECRET` isn't set. Why is this dangerous in production, and what would you do instead?
What's actually inside the JWT payload here (`userId`, `role`), and why encode the role in the token instead of looking it up from the database on every request?
What happens to a logged-in user's access if their role is changed by an admin after the token was issued? How would you fix that staleness?

## Why does `verifyToken` check for `authHeader.startsWith("Bearer ")` — what's the significance of the `Bearer` scheme, and what breaks if the client sends just the raw token?
The client sends the JWT token in the Authorization header using the Bearer scheme, so we check whether the header starts with Bearer before extracting and verifying the token


Walk through `authorizeRoles(...allowedRoles)` — why is it written as a function returning a function (middleware factory) instead of a single middleware?
What's the difference between `verifyToken` (authentication) and `authorizeRoles` (authorization), and why are they separate middleware instead of one combined function?
The `User` model restricts `role` to `["user", "admin", "moderator"]`, but the separate `Role` model defines `["admin", "user", "manager"]`. What's the bug here, and how would you unify these into a single source of truth?
The `Role` model/collection exists but nothing in the codebase ever reads from or writes to it — what was it probably meant for, and how would you actually wire it in (e.g. dynamic roles instead of a hardcoded enum)?
Why store the JWT in `localStorage` on the frontend instead of an httpOnly cookie? What attack does that expose you to, and how would you mitigate it?
`API.interceptors.request.use()` attaches the token to every outgoing request — what happens if the token has expired? How would you detect a 401/403 response globally and force a re-login?
There's no refresh token mechanism — the JWT just expires after `1d`. How would you add silent token refresh without forcing the user to log in again?
On the frontend, `{user.role === "admin" && (...)}` hides the Admin Controls button for non-admins. Why is this not real security, and what actually protects the `/admin-dashboard` route?
If a non-admin user manually calls `/api/auth/admin-dashboard` with a valid token (e.g. via Postman), what response do they get, and where in the code is that decision made?
Why does `register` return the created user's `id`, `name`, `email`, `role` but never the `password` — what would go wrong if it did?
The register endpoint lets the client pass `role` directly in the request body (`role || "user"`). Why is this a privilege escalation vulnerability, and how would you prevent a normal signup from creating an admin?
Why does `User.findOne({ email })` get used both to check for duplicates in `register` and to fetch the user in `login`? Is `email` indexed, and why does `unique: true` in the schema matter here?
What happens if two registration requests for the same email arrive at nearly the same time — could the `findOne` + `save` sequence create a race condition with duplicate accounts?
Why is `app.use(cors())` called with no options here, and what's the security risk of allowing all origins in production? How would you restrict it to just the frontend's origin?
How would you add centralized error handling (an Express error-handling middleware) instead of the repeated try/catch + `res.status(500)` blocks in every controller?
What's missing from this API in terms of input validation (e.g. email format, password strength) — how would you add it (Joi, Zod, express-validator)?
There's no rate limiting on `/login` or `/register`. Why does that matter for brute-force protection, and how would you add it?
How would you implement "logout" server-side given JWTs are stateless — what's the tradeoff between a token blacklist/denylist and just letting the token expire?
How would you extend this system to support more granular permissions (e.g. "can edit posts" vs just a coarse "admin"/"user" role) instead of role-only checks?
Why does `mongoose.connect()` get called before `app.listen()` in `server.ts`, and what would happen to incoming requests if the DB connection failed but the server still started?
How would you write an integration test for `authorizeRoles` to verify a "manager" can hit `/manager-panel` but not `/admin-dashboard`?
If this needed to scale to microservices, how would authentication/authorization typically be centralized (e.g. an API gateway validating JWTs) instead of every service re-implementing `verifyToken`?
