What is RBAC (Role-Based Access Control), and how does it differ from ABAC or ACL-based authorization?
Walk through what happens end-to-end from a user submitting the login form to landing on the dashboard — every request, token, and storage step involved.

## Why is the password hashed with bcrypt before saving, and what does the `saltRounds` value of 10 actually control? What happens if you increase it to 20?
1. What is bcrypt?
- bcrypt is primarily used for hashing passwords.
- User enters:
"mypassword123"
        ↓ bcrypt
Database stores:
"$2b$10$...."

2. What is crypto?

crypto is Node.js's built-in cryptography module.

It provides many different cryptographic operations.

For example:
random values , hashing. HMAC, encryption/decryption, digital signatures, key generation, UUIDs
etc.

Note: 

🔐 bcrypt → designed for securely hashing passwords
And:
🎲 crypto → general cryptography toolbox; crypto.randomBytes() can generate secure random refresh tokens.


## Why compare passwords with `bcrypt.compare()` instead of hashing the submitted password and checking equality against the stored hash?
bcrypt is salted, so hashing the same password again normally produces a different hash. bcrypt.compare() verifies the submitted password against the stored hash using the salt contained in the stored hash.

## The JWT secret falls back to a hardcoded string (`"super-secret-key-for-rbac"`) when `process.env.JWT_SECRET` isn't set. Why is this dangerous in production, and what would you do instead?

The real danger is:
If an attacker knows the hardcoded JWT secret, they can potentially create their own valid JWTs and the server may trust them as legitimate.

A hardcoded fallback JWT secret is dangerous in production because if the secret is known or leaked, an attacker can forge valid JWTs and potentially impersonate users or obtain unauthorized privileges. I would require JWT_SECRET to be provided through a secure environment variable or secrets manager, fail fast if it is missing, and use a strong randomly generated secret

## What's actually inside the JWT payload here (`userId`, `role`), and why encode the role in the token instead of looking it up from the database on every request?
If we only put the `userId` in the JWT, the server needs to query the database on every request to get the user's role and then check whether the user is allowed to access the resource.

If we put both `userId` and `role` in the JWT, the server can get the user's identity and role directly from the token, check the role, and allow or reject the request without querying the database.


## What happens to a logged-in user's access if their role is changed by an admin after the token was issued? How would you fix that staleness?
If an admin changes a user's role after the JWT was issued, the old JWT may still contain the old role.

We have two options: we can allow the user to use the old role until the access token expires, or we can revoke the user's session immediately.

In our application, we revoke the session when the role changes. This forces the user to log in again and get a new token with the updated role.


## Why does `verifyToken` check for `authHeader.startsWith("Bearer ")` — what's the significance of the `Bearer` scheme, and what breaks if the client sends just the raw token?
The client sends the JWT token in the Authorization header using the Bearer scheme, so we check whether the header starts with Bearer before extracting and verifying the token


## Walk through `authorizeRoles(...allowedRoles)` — why is it written as a function returning a function (middleware factory) instead of a single middleware?

`authorizeRoles(...allowedRoles)` is written as a function that returns another function because Express middleware needs to receive `req`, `res`, and `next`.
We also need to pass our own parameters, such as the allowed roles. So `authorizeRoles("admin")` first receives the roles and then returns a middleware function that receives `req`, `res`, and `next` from Express.
This makes it easy to check the user's role and provide role-based access to different APIs.

## What's the difference between `verifyToken` (authentication) and `authorizeRoles` (authorization), and why are they separate middleware instead of one combined function?

verifyToken is responsible for authentication. It checks whether the client has a valid JWT. If the token is valid, it identifies the user and allows the request to continue.

authorizeRoles is responsible for authorization. It checks whether the authenticated user's role is allowed to access a particular API.

For example:

Login:
User sends email and password → controller checks the password → server generates a JWT → JWT is given to the client.

Later, when the client calls an API:

Request → verifyToken → check JWT → identify user → authorizeRoles → check user role → allow or reject.

They are separate middleware because authentication and authorization are different jobs. Authentication answers "Who are you?", while authorization answers "Are you allowed to do this?"


## The `User` model restricts `role` to `["user", "admin", "moderator"]`, but the separate `Role` model defines `["admin", "user", "manager"]`. What's the bug here, and how would you unify these into a single source of truth?
The bug is that the User model and Role model have different role definitions. This can cause inconsistent behavior because a role accepted in one model may be rejected by the other.

To fix this, I would create a single source of truth for the roles, such as a shared TypeScript enum or constant, and import it into both models.

For example, I could define the roles once:

["user", "admin", "moderator"]

and use the same definition in both the User model and the Role model. This prevents the role lists from becoming different in different places.

For example:

export const ROLES = ["user", "admin", "moderator"] as const;


## The `Role` model/collection exists but nothing in the codebase ever reads from or writes to it — what was it probably meant for, and how would you actually wire it in (e.g. dynamic roles instead of a hardcoded enum)?
Main idea: hardcoded enum = fixed roles; Role collection = dynamically manageable roles.

## Why store the JWT in `localStorage` on the frontend instead of an httpOnly cookie? What attack does that expose you to, and how would you mitigate it?
Storing a JWT in localStorage is risky because if an XSS attack happens, malicious JavaScript can access the JWT from localStorage and use it to access protected resources as the user.

A safer approach is to store the JWT in an httpOnly cookie. JavaScript cannot directly read an httpOnly cookie, which makes token theft through XSS more difficult.

We should also use other security measures such as Secure and appropriate SameSite cookie settings, and protect against XSS by properly validating and escaping user input.

## What is Interceptor ?
Interceptor = a checkpoint between your application and the API where you can inspect, modify, or handle requests/responses.



## `API.interceptors.request.use()` attaches the token to every outgoing request — what happens if the token has expired? How would you detect a 401/403 response globally and force a re-login?
If the JWT has expired, the API will typically return a 401 response. I would use an Axios response interceptor to handle 401 errors globally. When I receive a 401, I clear the stored token and redirect the user to the login page. A 403 usually means the user is authenticated but doesn't have permission, so I would handle it as an authorization error rather than automatically logging the user out.

Easy interview answer
“For a 401, I would clear the token and redirect the user to login because their authentication is invalid. For a 403, I would keep the user logged in and show an unauthorized or access-denied message because they don't have the required permission.”


## There's no refresh token mechanism — the JWT just expires after `1d`. How would you add silent token refresh without forcing the user to log in again?
I would issue two tokens at login instead of one: a short-lived access token (15 minutes) for authenticating normal requests, and a long-lived refresh token (7 days) whose only job is to get a new access token. Both are stored as httpOnly cookies so JavaScript can never read them. When the access token expires, the next API call gets a 401, and instead of logging the user out immediately, an axios response interceptor catches that 401, silently calls a `/auth/refresh` endpoint, and the server checks the refresh token, issues a fresh access token, and retries the original request — the user never notices. I also rotate the refresh token on every refresh call and store only its hash in the database, so if a refresh token is ever reused after being rotated, I can detect that as token theft and force a real logout.

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

-----------------------------------------------------------------------
## Short-lived access token + refresh token (backend)

## Why split into a 15-minute access token and a 7-day refresh token instead of one long-lived JWT? What does each one trade off?
With a single long-lived JWT, if it's ever stolen (XSS, a compromised device, a logged network), the attacker has full access for as long as that token is valid — which could be days. And since JWTs are stateless, there's no easy way to revoke just that one token without extra machinery. Splitting into two tokens lets me get both security and convenience: the access token is short-lived (15 minutes), so it's attached to almost every request but a stolen one is only useful for a few minutes. The refresh token lives much longer (7 days) so the user doesn't have to log in again constantly, but it's rarely sent — only to `/auth/refresh` — and I can store a hash of it server-side, which means I can actually revoke it (on logout, or if I detect reuse of an already-rotated token). So the trade-off is: the access token optimizes for low blast-radius and stays fully stateless, while the refresh token optimizes for user convenience and accepts a bit of server-side state in exchange for being revocable.

## Why is the refresh token hashed with SHA-256 before being stored in `User.refreshTokenHash` instead of storing the raw token?
It's the same reasoning as password hashing: the database is a leak surface. If someone dumps the `users` collection (a SQL/NoSQL injection, a misconfigured backup, an insider), a raw refresh token stored in plain text is immediately usable — they can call `/auth/refresh` with it and mint themselves fresh access tokens for that account, no password needed. By storing only `sha256(token)`, the leaked row is useless on its own; you'd need the original token too, which only ever lived in the httpOnly cookie in the user's browser. On every `/refresh` call I just hash the incoming cookie value the same way and compare it to the stored hash — I never need to reverse it, so a one-way hash is enough (no need for bcrypt's slow salting here, since refresh tokens are long random-entropy JWTs, not low-entropy human passwords vulnerable to brute-forcing).

## Walk through `issueTokenCookies` — why does it save the new refresh token's hash to the DB *before* setting the cookies, and what would go wrong if that order were reversed?
`issueTokenCookies` generates both tokens, sets `user.refreshTokenHash = hashToken(refreshToken)`, awaits `user.save()`, and only after that succeeds does it call `res.cookie(...)` for both. The DB write has to happen first because the DB is the source of truth for "what refresh token is currently valid" — the very next request (a call to `/auth/refresh`) will hash whatever token the browser sends and compare it against that stored value. If the order were reversed — cookies sent to the browser first, DB save after — there's a window where the client already has a working-looking refresh token cookie, but the database still has the *old* hash (or nothing, on first login). If the `save()` then failed (a dropped DB connection, a validation error) or was simply slow, and the user's browser fired a refresh request in that gap, the server would reject a token the client was told is valid — or worse, on a slow save, a second concurrent request could read stale state and rotate against the wrong hash entirely. Saving first means the cookie is never handed out until the DB unambiguously agrees it's valid.

## What is refresh token rotation, and where does this code implement it (hint: every successful `/refresh` call)?
Refresh token rotation means a refresh token is single-use: every time it's successfully exchanged for a new access token, it's also replaced by a brand new refresh token, and the old one is immediately invalidated. This is different from a static refresh token that stays valid for its whole 7-day lifetime — rotation shrinks the window an attacker has if a refresh token is ever stolen, because the moment the real user refreshes again, the stolen copy stops working. In this code it's implemented in `rotateRefreshToken()` (called from `refresh()` at authController.ts): every successful `/refresh` call generates a *new* `newAccessToken` and `newRefreshToken`, hashes the new refresh token, and atomically swaps it into `User.refreshTokenHash` via `findOneAndUpdate`, then sets both as new cookies. The old refresh token's hash no longer exists anywhere after that — presenting it again fails the hash comparison.

## Explain the "reuse detection" branch in the `refresh` controller — if `user.refreshTokenHash !== hashToken(refreshToken)`, why does that imply the token was stolen, and why does the response wipe the hash and force a fresh login instead of just rejecting the request?
Because of rotation, at any moment there is exactly *one* valid refresh token per user — the one whose hash is currently in `refreshTokenHash`. If a client presents a token whose hash doesn't match what's stored, that token must be from a *previous* rotation — it was already exchanged once and superseded. Under normal use that should never happen, because the legitimate user's browser always holds the latest cookie the server just set. So a mismatch is a strong signal that a copy of an old, already-superseded refresh token is being replayed — most plausibly because it was stolen at some point (logged somewhere, intercepted, exfiltrated) and the thief is now using their captured copy while the real user has since rotated past it. Just rejecting that one request isn't enough: the stolen copy would still be sitting out there, and the thief could keep retrying (or wait and try again later). So the response goes further and sets `refreshTokenHash = null` — this immediately invalidates the *current, legitimate* token too, killing the whole session and forcing everyone (real user and attacker alike) to log in again with the password. It's a deliberately blunt "kill the session" response, trading a bit of user inconvenience for closing the door on a suspected compromise.

## Why does `verifyToken` return `401` for an expired/invalid access token instead of `403` like it used to? What would break in the frontend refresh flow if it still returned `403`?
The axios response interceptor only attempts a silent refresh when it sees a `401` (`if (error.response?.status === 401 && ...)` in `axios.ts`). `401` conventionally means "you are not authenticated" — exactly the case where trying again after re-authenticating (i.e., refreshing) makes sense. `403` conventionally means "you are authenticated, but forbidden" — a case where retrying with a *different* token wouldn't help, like `authorizeRoles` rejecting a non-admin from `/admin-dashboard`. If `verifyToken` still returned `403` on an expired token, the interceptor's `if` check would never match, so it would never call `/auth/refresh` — the error would just propagate straight to the caller as a hard failure, and the user would effectively get logged out (or see a broken UI) the moment their 15-minute access token expired, defeating the entire point of having a refresh flow. Keeping `401` for "your token is missing/invalid/expired" and reserving `403` for "your token is fine but you don't have permission" is what lets the interceptor tell those two situations apart and only retry the one that's actually retryable.

## Why is the `refreshToken` cookie scoped to `path: "/api/auth"` while the `accessToken` cookie uses `path: "/"`? What's the security benefit of narrowing the refresh cookie's path?
(This code has since been narrowed further, to `path: "/api/auth/refresh"` specifically — but the reasoning is the same either way.) `accessToken` needs `path: "/"` because literally any route might be behind `verifyToken`, so the browser has to attach it everywhere. `refreshToken` only has one job — being read by the `/auth/refresh` endpoint — so there's no reason for the browser to send it anywhere else. The security benefit is reduced exposure: the refresh token is the longer-lived, more sensitive of the two credentials (7 days vs. 15 minutes, and it's the one that can mint new access tokens indefinitely via rotation). Every additional endpoint a cookie gets sent to is one more place it could show up in server logs, be forwarded to an internal proxy, get accidentally echoed in an error response, or be captured by a misbehaving middleware. By scoping it to just the refresh endpoint, it's transmitted far less often, which shrinks all of those incidental-leak surfaces without weakening the actual authentication flow at all.

## `generateAccessToken` and `generateRefreshToken` are signed with two different secrets (`ACCESS_TOKEN_SECRET` vs `REFRESH_TOKEN_SECRET`). Why not just reuse the same secret for both?
Using separate secrets means the two token types live in completely separate trust domains — a token forged or verified with one secret is meaningless to the code path that checks the other. This matters because access and refresh tokens play very different roles and are checked in very different places (`verifyToken` middleware, which runs on nearly every request, vs. the `refresh` controller, which is one specific endpoint). If they shared a secret and `ACCESS_TOKEN_SECRET` ever leaked (say, through a logging mistake in a request-scoped context, or a bug that exposed it in an error message), an attacker could forge not just access tokens but also refresh tokens signed with the exact same key — instant long-term persistence. With separate secrets, a leak of one only compromises that one token type's trust, and you can rotate/replace the compromised secret independently without also having to invalidate the other token type's entire signing scheme.

## The `User` schema marks `refreshTokenHash` with `select: false`. Why, and what would happen to `refresh()`'s `user.refreshTokenHash` check if `.select("+refreshTokenHash")` were removed from the query?
`select: false` means Mongoose excludes that field from query results *by default* — a plain `User.findOne(...)` or `User.findById(...)` simply won't include `refreshTokenHash` in the returned document, even though it's still stored in MongoDB. This is a safety default: it means every other place in the codebase that fetches a user (say, a future "get profile" endpoint) can't accidentally leak or expose this sensitive field just because nobody remembered to explicitly strip it out — you have to opt in on purpose. That's exactly what `refresh()` does with `.select("+refreshTokenHash")` — the `+` prefix explicitly re-includes a normally-excluded field for that one query. If that `.select("+refreshTokenHash")` were removed, `user.refreshTokenHash` would come back as `undefined` on the fetched document, so `!user.refreshTokenHash` would always be `true` — every single refresh attempt would immediately fail with "Invalid refresh token," even for a completely legitimate, freshly-issued token. It wouldn't be a security hole, just a hard break: nobody could ever refresh successfully.

## Since there's only one `refreshTokenHash` field per user, what happens if the same user logs in from two different browsers/devices? How would you redesign this to support multiple concurrent sessions?
Because `refreshTokenHash` is a single scalar field on the `User` document, only the *most recent* login's refresh token can ever be valid. If the user logs in on their laptop and then logs in again on their phone, the phone's login overwrites `refreshTokenHash` with its own hash — the laptop's refresh token now fails the hash comparison the next time it tries to refresh (and worse, under the current reuse-detection logic, that mismatch would be treated as suspected theft and would wipe the hash entirely, logging the phone out too). So effectively this design supports exactly one active session per user at a time; logging in anywhere immediately, silently kicks out every other device. To support genuine multi-device sessions, I'd replace the single `refreshTokenHash: string | null` field with a collection of session records instead — either an embedded array on the user document (`sessions: [{ tokenHash, deviceInfo, createdAt, expiresAt }]`) or, better for scale, a separate `RefreshToken`/`Session` collection keyed by `userId`, so each login creates its own independent row. Rotation and revocation would then target *one specific session's* row (matched by which token hash was presented) instead of the user's single field, which also naturally gives you a "log out this device" or "see all your active sessions" feature for free.


## What happens if two tabs both hit an expired access token at the same time and both call `/auth/refresh` concurrently — could the first rotation invalidate the second request's refresh token before it's checked? How would you prevent that race server-side?

Yes — originally this codebase had exactly that race: `refresh()` did a plain read-then-write (`findById` → compare the hash → save a new one), so if two tabs both called `/auth/refresh` at nearly the same instant, both could read the *same still-valid* hash before either had written back. Both would then pass the "is this the current token?" check, and whichever write landed second would silently overwrite the first tab's brand-new hash with its own — leaving the first tab's freshly-issued refresh token pointing at a hash the DB no longer has, effectively locking that tab out on its *next* refresh even though it did nothing wrong.

I fixed it with an atomic compare-and-swap at the database level instead of read-then-write: `rotateRefreshToken()` now calls `User.findOneAndUpdate({ _id: user._id, refreshTokenHash: presentedHash }, { refreshTokenHash: newHash })` — the filter re-checks the hash *as part of the same atomic operation* that updates it. MongoDB serializes writes to a single document, so if two requests race, only the first one's filter still matches; the second's `findOneAndUpdate` returns `null` instead of clobbering the winner. The loser gets a `409` ("refresh already handled, please retry") instead of a `403` — it's not treated as theft, just a lost race. On the frontend, the axios interceptor treats that `409` as "someone else already refreshed" and simply retries the original request, since the winning tab's response already updated the shared browser cookie jar with a fresh access token that this tab can now use.

## Why does `logout` try to decode the refresh token and null out `refreshTokenHash` in the DB, rather than only clearing the cookies?
Clearing cookies only logs the user out of that one browser — it doesn't touch the still-valid refresh token stored on the server. If someone had a copy of that refresh token (a stolen cookie, a synced browser profile, a shared machine), clearing cookies on this device wouldn't stop it from still working elsewhere. So logout also decodes the token, finds the user, and sets `refreshTokenHash = null` in the DB — that revokes the token server-side too, so even a copy of it is useless afterward. (In this codebase specifically, that decode now reads the `accessToken` cookie instead of `refreshToken`, since the refresh cookie's path was narrowed to `/api/auth/refresh` only and no longer reaches the logout route — but the goal is the same: identify the user and null out their stored hash, not just wipe local cookies.)

## If an attacker steals the refresh token cookie (e.g. via a compromised browser extension) but not the access token, what can they do with it, and how does rotation + reuse detection limit the damage?
If an attacker steals the refresh token, they can use it to obtain a new access token and access protected resources. Rotation replaces the refresh token after each successful refresh, making the old token invalid. If the stolen old token is reused, reuse detection can identify the mismatch and revoke the session, forcing a fresh login

## Why is a refresh token stored server-side at all (semi-stateful) while the access token is fully stateless and never touches the DB?
Access tokens are short-lived and stateless, so the server can validate them without a database lookup. Refresh tokens are long-lived and more sensitive, so we store their hashes server-side. This allows us to revoke sessions, detect reuse, and force re-authentication when necessary

------------------------------------------------------------------

## Short-lived access token + refresh token (frontend)

Walk through the axios response interceptor in `axios.ts` end-to-end: a request gets a 401 — what happens step by step before the original request is retried?
Why does the interceptor check `!originalRequest._retry` before attempting a refresh? What would happen without that flag if the refreshed token was somehow still invalid?
Why are `/auth/login`, `/auth/register`, and `/auth/refresh` explicitly excluded from triggering the refresh-and-retry logic (the `isAuthRoute` check)? What would happen without that exclusion if the refresh call itself ever returned a 401?
What problem does the `refreshInFlight` shared promise solve? What would happen if 5 API calls all 401 at the same exact moment and each triggered its own independent `/auth/refresh` call?
Why does a failed refresh dispatch a `window.dispatchEvent(new Event("auth:session-expired"))` instead of directly manipulating React state from inside `axios.ts`?
Why does `App.tsx` register the `auth:session-expired` listener inside a `useEffect` with a cleanup function (`removeEventListener`) instead of just adding it once globally?
The access token cookie isn't readable by JavaScript (`httpOnly`) — so how does the frontend know when to proactively refresh versus reactively refresh only after getting a 401? What are the tradeoffs of each approach (reactive vs. a `setTimeout` scheduled slightly before expiry)?
If the user has two tabs open and one tab's silent refresh rotates the token, does the other tab's next request still work? Why or why not, given cookies are shared across tabs on the same origin?
Since `withCredentials: true` sends cookies automatically, why is there no code anywhere in the frontend that reads or manages the access/refresh tokens directly?
What UX would you add so the user isn't silently logged out with no explanation when the refresh token finally expires after 7 days?
