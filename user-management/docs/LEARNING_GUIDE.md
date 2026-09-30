# Learning Guide

Work through this guide **in order**, with the code open next to it. Each phase builds on the
previous one. For the important files you get the same eight answers:

1. What it does · 2. Why it exists · 3. Who calls it · 4. What it calls · 5. How data flows through it
6. What breaks without it · 7. Framework-specific parts · 8. Plain TypeScript/JavaScript parts

Paths are relative to `user-management/`.

---

## Phase 1: Project setup (`package.json`, `tsconfig.json`, `.env`, `app.ts`, `server.ts`)

### `backend/package.json`

- **dependencies** ship to production: `express`, `mongoose`, `dotenv`, `cors`.
- **devDependencies** are only for developing: TypeScript, Jest, Supertest, ESLint, `@types/*`.
  `npm ci --omit=dev` on a server would skip them.
- **scripts** are the project's command menu. `npm run dev` runs `tsx watch src/server.ts`. `tsx`
  executes TypeScript directly (no build step) and restarts when files change. `npm run build` runs
  `tsc` to produce plain JavaScript in `dist/`, and `npm start` runs that. `npm test` runs `jest`.
- `package-lock.json` pins the exact version of every package (including dependencies of
  dependencies). Commit it, because it is what makes `npm ci` reproducible in CI.

### `backend/tsconfig.json` and `tsconfig.build.json`

| Option                               | Why                                                                          |
| ------------------------------------ | ---------------------------------------------------------------------------- |
| `strict: true`                       | Turns on all the strong checks (`null` safety, no implicit `any`). Non-negotiable. |
| `module/moduleResolution: NodeNext`  | Emit and resolve modules the way Node.js itself does.                        |
| `isolatedModules: true`              | Every file must compile on its own. Required by fast transpilers like ts-jest/tsx. |
| `noUnusedLocals/Parameters`          | Dead code becomes a compile error. Prefix a parameter with `_` to mark it intentionally unused. |
| `types: ["node", "jest"]`            | Which global type packages exist (`process`, `describe`, `expect`...).       |

There are two files because they do different jobs. `tsconfig.json` type-checks **src and tests**
(`npm run typecheck`, the editor, ESLint). `tsconfig.build.json` extends it and compiles **only
`src`** into `dist/`, so test files never ship to production.

### `backend/.env` / `.env.example` → `src/config/env.ts`

1. **What:** loads `.env` into `process.env` and exposes a typed `env` object plus `assertRequiredEnv()`.
2. **Why:** configuration (ports, DB URLs, secrets) changes per machine and must never be hard-coded or committed.
3. **Called by:** `app.ts` (reads `CLIENT_URL`) and `server.ts` (reads everything, calls `assertRequiredEnv`).
4. **Calls:** `dotenv.config()`.
5. **Flow:** `.env` file → `process.env.X` (always a `string | undefined`) → converted/defaulted → `env.PORT: number`.
6. **Without it:** every file would read `process.env` itself, with its own defaults, and a missing
   `MONGODB_URI` would surface later as a confusing Mongoose error instead of a clear startup message.
7. **Framework-specific:** `dotenv.config()`.
8. **Plain TS/JS:** `process.env`, `??` (nullish coalescing: use the right side only if the left is
   `null`/`undefined`), `Number()`, throwing an `Error`.

`assertRequiredEnv()` is only called from `server.ts`, so importing `app.ts` in tests doesn't need a
`MONGODB_URI` at all.

### `backend/src/app.ts`

1. **What:** creates the Express application and registers, **in order**: CORS → JSON body parser →
   routes → 404 handler → error handler. It **exports** the app and never calls `listen()`.
2. **Why:** a configured app is something you can hand to Supertest. A listening server is a
   running process with a port, which is exactly what tests don't want.
3. **Called by:** `server.ts` (production) and every integration test (`request(app)`).
4. **Calls:** `cors()`, `express.json()`, `userRoutes`, `notFoundHandler`, `errorHandler`.
5. **Flow:** each request passes through the `app.use` list top to bottom until something sends a
   response or calls `next(err)`, which jumps straight to the error handler.
6. **Without it:** you'd configure the app inside `server.ts`, and tests would have to start a real
   server on a real port (slow, port conflicts, "Jest did not exit" warnings).
7. **Framework-specific:** `express()`, `app.use`, `app.get`, middleware ordering rules.
8. **Plain TS/JS:** ES module imports and exports.

**Order matters:** `express.json()` must come before the routes (otherwise `req.body` is
`undefined`). `notFoundHandler` must come after all routes (otherwise it catches everything).
`errorHandler` must be last.

### `backend/src/server.ts`

1. **What:** the process entry point. Validates env → connects MongoDB → `app.listen(PORT)` →
   sets up graceful shutdown on `SIGINT`/`SIGTERM`.
2. **Why:** this is the only "impure" startup code. Keeping it here keeps `app.ts` side-effect free.
3. **Called by:** `npm run dev` / `npm start`. **Never imported by tests.**
4. **Calls:** `assertRequiredEnv`, `connectDatabase`, `app.listen`, `server.close`, `disconnectDatabase`.
5. **Flow:** if anything in `startServer()` throws (bad env, DB unreachable), the `.catch` logs it and
   exits with code 1, so process managers and Docker know the start failed.
6. **Without it:** there'd be nothing to run. If this code lived in `app.ts`, every test import would
   try to connect to your real database and open port 5000.
7. **Framework-specific:** `app.listen`, `server.close`.
8. **Plain TS/JS:** `async`/`await`, `process.on`, `process.exit`.

> **Why separate `app.ts` and `server.ts`?** One creates the app, the other runs it.
> Supertest needs only the first: `request(app)` starts the app on a random free port internally
> for each request and closes it again. You get no port conflicts, parallel test files work, and nothing
> is left running.

### `backend/src/config/database.ts`

Two small functions, `connectDatabase(uri, options?)` and `disconnectDatabase()`. They're shared by
`server.ts` (your real DB) and `tests/helpers/testDb.ts` (the in-memory DB), so both connect the
same way.

---

## Phase 2: The layers (routes, controllers, services, models)

```text
Route        "which code handles POST /api/users?"       knows URLs & middleware order
Controller   "turn this HTTP request into a function call" knows req/res & status codes
Service      "what are the rules?"                         knows business logic, NOT HTTP
Model        "what does a user look like in the DB?"      knows schema, indexes, queries
MongoDB      stores documents
```

Each layer only talks to the one directly below it. That is the whole trick: every layer can be
understood and tested on its own.

> **Is this over-engineering for 5 endpoints?** Slightly, and on purpose, since you're learning the
> pattern. The line is drawn at _one file per layer per resource_. There are no repository
> interfaces, dependency-injection containers, or abstract base classes. Those only pay off in much
> larger codebases.

### `backend/src/routes/user.routes.ts`

1. **What:** maps method + path to a chain of handlers, e.g.
   `router.put('/:id', validateObjectId, validateBody(validateUpdateUser), userController.updateUser)`.
2. **Why:** you can read the whole API surface of a resource in one screen.
3. **Called by:** `app.ts` via `app.use('/api/users', userRoutes)`, so `'/'` here means `/api/users`.
4. **Calls:** middleware, then controller functions.
5. **Flow:** handlers run left to right. Each middleware either calls `next()` (continue) or
   `next(error)` (skip to the error handler).
6. **Without it:** routes would pile up in `app.ts` with validation mixed into every handler.
7. **Framework-specific:** `Router`, `router.get/post/put/delete`, `:id` params.
8. **Plain TS/JS:** passing functions as values.

### `backend/src/controllers/user.controller.ts`

```text
Request
 ↓ Express calls createUser(req, res)
Controller reads req.body (already validated & cleaned by validateBody)
 ↓
await userService.createUser(req.body)
 ↓ service returns a user document (or throws)
sendSuccess(res, 201, user, 'User created successfully')
 ↓
HTTP 201 { success: true, message, data: user }
```

1. **What:** five thin functions (create, list, get, update, delete).
2. **Why:** it keeps HTTP concerns (status codes, `req.params`) out of the business logic.
3. **Called by:** Express, via the routes.
4. **Calls:** `userService.*`, `sendSuccess`.
5. **Flow:** see the diagram. On an error it does nothing: the rejected promise propagates.
6. **Without it:** services would have to receive `req`/`res`, which makes them untestable without
   fake HTTP objects and impossible to reuse from, say, a CLI script or a queue worker.
7. **Framework-specific:** `Request<Params, ResBody, ReqBody>` generics, `res`.
8. **Plain TS/JS:** `async` functions, `await`.

**Why no `try/catch`?** Express 5 automatically forwards a rejected promise from a handler to the
error middleware. In Express 4 you'd need `try { } catch (e) { next(e) }` or an `asyncHandler`
wrapper in every controller. You'll see that pattern in older codebases.

### `backend/src/services/user.service.ts`

1. **What:** `createUser`, `getAllUsers`, `getUserById`, `updateUser`, `deleteUser`, plus the private
   rule `ensureEmailIsAvailable`.
2. **Why:** a single home for the rules: "email must be unique" → 409, "no such user" → 404,
   "on update, only check the email if it changed".
3. **Called by:** controllers (and unit tests).
4. **Calls:** the `User` model; throws `ApiError`.
5. **Flow:** plain typed data in (`CreateUserRequest`), a `UserDocument` out, or an `ApiError` thrown.
6. **Without it:** rules get copy-pasted into controllers, and testing them would require HTTP.
7. **Framework-specific:** Mongoose query methods (`exists`, `create`, `find().sort()`, `findById`,
   `findByIdAndDelete`, `doc.set()`, `doc.save()`).
8. **Plain TS/JS:** everything else: `async`/`await`, `throw`, `if`.

Two design details worth noticing:

- **Duplicate emails are handled twice, and that's deliberate.** `ensureEmailIsAvailable` gives a clear 409
  in the normal case. But two simultaneous requests could both pass that check, so the model's
  **unique index** is the real guarantee: MongoDB rejects the second insert with error code
  `11000`, which `errorHandler` also turns into a 409. The integration test "the unique index
  rejects duplicates even if the service check is bypassed" proves that second line of defence exists.
- **`updateUser` loads the document and calls `save()`** instead of `findByIdAndUpdate`. That reuses
  `getUserById` (so the 404 lives in one place), runs all schema validators and updates
  `updatedAt`, and it reads naturally.

### `backend/src/models/user.model.ts`

1. **What:** the Mongoose schema (fields, types, rules, `unique` index, `timestamps`) and the `User` model.
2. **Why:** MongoDB itself is schemaless. The schema is where the application decides what a valid user is.
3. **Called by:** the service, test helpers, and some tests directly (for setup/assertions).
4. **Calls:** MongoDB (through the Mongoose connection).
5. **Flow:** `User.create(data)` → cast types → run validators → insert → return a document.
   `toJSON: { versionKey: false }` hides Mongoose's internal `__v` when the document is sent via `res.json`.
6. **Without it:** no validation at the database level, no unique index, no timestamps.
7. **Framework-specific:** `Schema`, `model`, `HydratedDocument`, schema options.
8. **Plain TS/JS:** the `IUser` interface and the shared constants from `validation.ts`.

**Two layers of validation?** `utils/validation.ts` validates **requests**: friendly, per-field,
all-errors-at-once messages for API clients, plus stripping unknown fields. The schema validates
**data**: the last line of defence for any code path that writes users. They share constants
(`EMAIL_REGEX`, `AGE_MAX`...) so they can't drift apart.

### Middleware: `validateBody.ts`, `validateObjectId.ts`, `notFoundHandler.ts`

- `validateBody(validator)` is a **middleware factory**: a function that returns a middleware.
  On failure it calls `next(ApiError.badRequest('Validation failed', errors))`. On success it
  **replaces** `req.body` with the cleaned data, so the controller never sees `"role": "admin"` or
  untrimmed strings.
- `validateObjectId` rejects `/api/users/123` with 400 **before** any database query. Without it,
  Mongoose would throw a `CastError`. The error handler maps that to 400 too, as a safety net, but
  checking early is clearer.
- `notFoundHandler` turns "no route matched" into a JSON 404. Express's default would be an HTML page.

### `backend/src/middleware/errorHandler.ts` + `utils/ApiError.ts`

1. **What:** `toApiError(err)` classifies _any_ thrown value. `errorHandler` sends
   `{ success: false, message, errors? }` with the matching status.
2. **Why:** there is one place that decides what errors look like, which gives consistent responses
   and hides internal details (stack traces, DB messages) from clients.
3. **Called by:** Express, whenever anything calls `next(err)` or a handler's promise rejects.
4. **Calls:** `console.error` for 5xx only (a 404 is normal and not worth logging).
5. **Flow:**

```text
Service:   throw ApiError.conflict('A user with this email already exists')
Controller: await rejects, not caught
Express:    sees a rejected handler → calls errorHandler(err, req, res, next)
errorHandler: err instanceof ApiError → status 409, message kept
Response:   409 { "success": false, "message": "A user with this email already exists" }
```

6. **Without it:** every controller would need its own `try/catch` and status-code mapping, each
   slightly different, and an unexpected crash would leak an HTML stack trace.
7. **Framework-specific:** the **four-argument** signature `(err, req, res, next)` is how Express
   recognises an error handler, which is why `_next` must stay even though it's unused.
   `mongoose.Error.ValidationError` and `CastError` are Mongoose's error classes.
8. **Plain TS/JS:** `class ApiError extends Error`, `instanceof`, a **type guard**
   (`isDuplicateKeyError(err): err is DuplicateKeyError`).

---

## Phase 3: One complete request, `POST /api/users`

Follow this with the files open. Request body:
`{ "name": "  John ", "email": "John@Example.com", "age": 25, "role": "admin" }`

| # | Where                                      | What happens                                                                                                  |
| - | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| 1 | `app.ts` → `cors()`                        | Adds `Access-Control-Allow-Origin` if the origin matches `CLIENT_URL`.                                         |
| 2 | `app.ts` → `express.json()`                | Parses the raw body into `req.body`. Invalid JSON → `SyntaxError` → error handler → 400.                        |
| 3 | `app.ts` → `app.use('/api/users', ...)`    | Path matches, so Express enters the users router with the path `/`.                                           |
| 4 | `user.routes.ts`                           | `router.post('/', validateBody(validateCreateUser), createUser)`                                              |
| 5 | `validateBody` → `validateCreateUser`      | Checks each field. Valid → `req.body = { name: 'John', email: 'john@example.com', age: 25 }` (`role` dropped). |
| 6 | `user.controller.ts` → `createUser`        | Calls `userService.createUser(req.body)`.                                                                     |
| 7 | `user.service.ts` → `ensureEmailIsAvailable` | `User.exists({ email })`. Found → throw `ApiError.conflict` (skip to 11).                                   |
| 8 | `user.service.ts` → `User.create(input)`   | Mongoose casts, runs schema validators, adds `createdAt`/`updatedAt`.                                         |
| 9 | MongoDB                                    | Inserts the document; the unique index is checked here.                                                       |
| 10 | back in the controller                    | `sendSuccess(res, 201, user, 'User created successfully')` → `res.status(201).json(...)`; `toJSON` drops `__v`. |
| 11 | (error path) `errorHandler`               | Converts whatever was thrown into `{ success: false, message }` + status.                                     |

Then try each of these in the terminal and trace which step stops the request:

```bash
curl -X POST localhost:5000/api/users -H "Content-Type: application/json" -d '{"name":"x"}'        # step 5 → 400
curl -X POST localhost:5000/api/users -H "Content-Type: application/json" -d '{bad'               # step 2 → 400
# create john@example.com twice                                                                   # step 7 → 409
```

---

## Phase 4: Backend testing

### 4.1 Jest basics: `describe` → `it`/`test` → `expect`

```ts
describe('validateCreateUser', () => {           // a group (can be nested)
  it('accepts valid input', () => {              // one test; `test` is an alias of `it`
    const result = validateCreateUser(valid);     // Arrange + Act
    expect(result).toEqual({ success: true, data: valid });   // Assert
  });
});
```

Matchers you'll see: `toBe` (same value/reference), `toEqual` (deep equality), `toMatchObject`
(subset), `toHaveBeenCalledWith`, `rejects.toThrow`, `resolves.toBe`, `expect.any(String)`,
`expect.objectContaining`. `it.each([...])` runs one test per row of data.

Start with **`tests/unit/validation.test.ts`**. It tests pure functions with no mocks, which is the simplest
kind of test. Then read the others in this order: `errorHandler` → `user.service` → `user.controller`
→ `integration/app` → `integration/users.api`.

### 4.2 Lifecycle hooks (see `tests/integration/users.api.test.ts`)

```ts
beforeAll(connectTestDb, 120_000); // ONCE before the first test: start in-memory MongoDB
afterEach(clearTestDb);            // after EVERY test: delete all documents
afterAll(closeTestDb);             // ONCE after the last test: disconnect + stop MongoDB
```

- **`beforeAll`** is for expensive setup that is safe to share (starting a database takes about a second).
  The `120_000` timeout covers the first-ever run, which downloads the `mongod` binary.
- **`beforeEach`** / **`afterEach`** reset state so **every test is independent**. With them, a test
  can run alone, in any order, and fails only because of its own code. Without cleanup, the
  "returns an empty array" test would fail whenever it ran after a test that created users.
  Here cleanup is in `afterEach`, but `beforeEach` would work too. The rule is simply that
  something resets state between tests. The frontend list test uses `beforeEach` to set up a default mock.
- **`afterAll`** releases resources. If you forget it, Jest prints "Jest did not exit one second
  after the test run has completed" because the DB connection keeps Node alive.
- **Mock cleanup** is configured globally in `jest.config.ts`: `resetMocks: true` wipes every
  `jest.fn()`'s calls **and** fake return values before each test, and `restoreMocks: true` puts
  back real functions replaced by `jest.spyOn`. That's why the test files have no manual cleanup code.

### 4.3 The test database strategy: `tests/helpers/testDb.ts`

**Choice:** `mongodb-memory-server` starts a **real `mongod` process** with in-memory storage, one per
test file.

| Option                            | Verdict                                                                                   |
| --------------------------------- | ----------------------------------------------------------------------------------------- |
| Mock Mongoose in integration tests | ✗ Proves nothing about queries, indexes, or casting. You'd be testing your mocks.        |
| Use your dev database             | ✗ Tests delete your data; results depend on what's already there.                         |
| Separate local test DB / Docker   | ✓ Works, but every developer and CI must install/run MongoDB.                             |
| **mongodb-memory-server**         | ✓ Real MongoDB, zero setup, isolated per test file, works identically in CI. **Simplest.** |

Details worth reading in `testDb.ts`:

- `model.init()` waits for indexes to be built, so the duplicate-email test can't race the index
  creation.
- `clearTestDb` uses `deleteMany({})` rather than `dropDatabase()`, because dropping would also drop the
  unique index we just built.
- `{ runtimeAdapters: { os } }`: MongoDB driver 7.6+ loads Node's `os` module with a dynamic
  `import()`, which Jest's CommonJS sandbox refuses. The driver swallows that error and sends an
  empty handshake, so the server rejects the connection with a confusing
  `Missing required sub-document 'driver'`. Passing `os` in explicitly avoids it. This is a real-world
  example of test infrastructure needing a workaround, documented where it happens.

### 4.4 Supertest integration tests

```ts
const response = await request(app).post('/api/users').send({ name: 'John', email: 'john@example.com', age: 25 });
expect(response.status).toBe(201);
const saved = await User.findById(response.body.data._id);   // verify the DB, not just the response
```

**Why Supertest?** It sends real HTTP requests through the real Express stack (routing,
middleware, JSON parsing, error handler, headers) without you starting a server. It's the closest
you can get to a real client while staying fast and self-contained.

Notice what the integration tests catch that unit tests can't: middleware order, that
`express.json()` actually parses, that `validateObjectId` is wired to the right routes, that
Mongoose lower-cases emails, that the unique index exists, that `__v` is hidden.

`tests/integration/app.test.ts` shows that Supertest doesn't require a database. Health checks,
404s and CORS never touch Mongoose, so that file doesn't start one.

### 4.5 Mocks: `jest.fn`, `jest.spyOn`, `jest.mock`

| Tool                  | Replaces                                   | Used in                       | Why there                                                                  |
| --------------------- | ------------------------------------------ | ----------------------------- | -------------------------------------------------------------------------- |
| `jest.fn()`           | creates a brand-new fake function          | controller & errorHandler tests (`res.status`, `res.json`), service test (`doc.save`, `sort`) | We need a fake `res` whose calls we can inspect. |
| `jest.spyOn(obj, 'm')`| **one** existing function, restorable      | controller test (`userService.createUser`), errorHandler test (`console.error`) | Only one function needs faking, and the real one should come back afterwards. |
| `jest.mock('path', factory)` | a **whole module**, for the whole file | service test (`models/user.model`) | Every model method must be fake, and the module must be replaced **before** the service imports it (Jest hoists `jest.mock` above the imports). |
| `mockResolvedValue(x)`| makes a mock return `Promise.resolve(x)`   | everywhere async              | Simulates a successful DB/service call.                                    |
| `mockRejectedValue(e)`| makes a mock return `Promise.reject(e)`    | service & controller tests    | Simulates failures that are hard to produce for real ("connection lost").  |
| `mockReturnValue(x)`  | synchronous return                         | `User.find` → `{ sort }`      | `find()` returns a query object synchronously; `.sort()` is what's awaited. |

**What is mocked, and why, in each unit test:**

- `user.service.test.ts` mocks the **`User` model**. The questions are about the service's own
  decisions: does it throw 409 **and skip `create`**? Does it skip the duplicate check when the email is
  unchanged? Does it let DB errors through? A mock can answer all of them instantly. Whether the
  queries work against real MongoDB is left to the integration tests.
- `user.controller.test.ts` spies on the **service functions** and fakes `req`/`res`. The only
  question is whether the controller passes the right thing in and sends the right status out.
- `errorHandler.test.ts` fakes `res` but uses **real** errors where it can. For example,
  `new User({ age: -5 }).validate()` produces a genuine Mongoose `ValidationError` without a database.
  Don't mock what you can cheaply use for real.

> **Rule of thumb:** mock at the boundary of the unit you're testing, and only what you need
> to control. If a test is mostly mock setup, it probably belongs in the integration suite.

About the cast in the service test,
`User as unknown as Record<'exists' | ..., jest.Mock>`: Mongoose methods have many TypeScript
overloads, which make typed mocks awkward. The cast is deliberately confined to test code, and the
comment says why. That is a legitimate, documented use of a type assertion, unlike sprinkling `any`
around.

---

## Phase 5: Frontend (component → hook → service → API)

```text
UsersListPage        renders loading / error / empty / table, owns the delete dialog state
   ↓ const { users, isLoading, error, deleteUser } = useUsers()
useUsers             useEffect → userService.getUsers() → setUsers / setError / setIsLoading
   ↓
userService          apiClient.get<ApiSuccessResponse<User[]>>('/users') → returns response.data.data
   ↓
apiClient (Axios)    baseURL '/api', JSON headers, interceptor: any failure → ApiRequestError
   ↓ HTTP GET /api/users
Vite dev proxy → Express
```

### `frontend/src/services/apiClient.ts` + `apiError.ts`

1. **What:** one configured Axios instance, and a response interceptor that converts every failure
   into an `ApiRequestError { message, status, fieldErrors }`.
2. **Why:** base URL, headers, timeout and error handling are configured once. The UI never
   sees an `AxiosError`.
3. **Called by:** `userService.ts` only.
4. **Calls:** Axios; `toApiRequestError`.
5. **Flow:** a 409 response `{ success: false, message: '...' }` → `AxiosError` → interceptor →
   `ApiRequestError('A user with this email already exists', 409)`. No response at all →
   `'Unable to reach the server. Is the backend running?'`.
6. **Without it:** every component would dig through `err.response?.data?.message` itself.
7. **Framework-specific:** `axios.create`, interceptors, `axios.isAxiosError`, `import.meta.env` (Vite).
8. **Plain TS/JS:** the `ApiRequestError` class.

### `frontend/src/services/userService.ts`

One function per endpoint, each unwrapping the `{ success, data }` envelope. **Why a service
layer on the frontend?** Components shouldn't know URLs or HTTP verbs. If the API changes
(`/users` → `/v2/users`, or Axios → `fetch`), you change one file. It is also the seam the component
tests mock.

### `frontend/src/hooks/useUsers.ts` / `useUser.ts`

1. **What:** fetch data in `useEffect`, and expose `{ data, isLoading, error }` (and `deleteUser` for the list).
2. **Why:** it separates **state management** from **rendering**. Pages become easy to read, and the
   same hook can be reused.
3. **Called by:** pages.
4. **Calls:** `userService`.
5. **Flow:** mount → `isLoading = true` (initial state) → request → `setUsers(data)` or
   `setError(message)` → `setIsLoading(false)` → React re-renders the page.
6. **Without it:** each page would repeat the same loading/error boilerplate.
7. **Framework-specific:** `useState`, `useEffect`, `useCallback`, the cleanup function.
8. **Plain TS/JS:** promises (`.then/.catch/.finally`), `Array.filter`.

The `ignore` flag: if the component unmounts (the user navigates away) before the request
finishes, the cleanup sets `ignore = true`, so we don't update a component that's gone. In
development, `<StrictMode>` mounts every component twice on purpose to expose missing cleanups like this.

`deleteUser` removes the user from local state after the API succeeds, so there is no second GET.
This is simpler than refetching, and the user sees the change immediately.

> **Why do Create/Edit pages call `userService` directly instead of a hook?** Hooks here manage
> _state that must be loaded_. Creating or updating is a one-off action whose loading/error state
> already lives in `UserForm`. Adding a `useCreateUser` hook would be abstraction for its own sake.
> If this app grew, a library like TanStack Query would replace these hooks entirely.

### `frontend/src/components/UserForm.tsx`

- **Controlled inputs:** React state is the source of truth (`value={values.name}` + `onChange`).
- Values are **strings** (that's what `<input>` produces). `toUserRequest` converts `age` to a number
  only on submit.
- `noValidate` turns off the browser's built-in validation bubbles so our own messages show consistently.
- Validation runs on submit. Errors render next to each field and are linked with
  `aria-describedby` + `aria-invalid`, which helps screen readers and lets tests use
  `toHaveAccessibleDescription`.
- If `onSubmit` throws, the form shows the message **and** maps the backend's `fieldErrors` onto the
  matching inputs. The same form serves Create and Edit. The page decides what submitting means.

**Client validation is for user experience, not security.** Anyone can call the API with `curl`, which is why
the backend validates everything again.

### Pages and routing

`App.tsx` holds only the route table. `main.tsx` wraps it in `<BrowserRouter>`. Keeping the router
**outside** `App` lets tests wrap the same `App` in a `<MemoryRouter initialEntries={['/users/new']}>`
and start at any URL. This is the frontend version of the `app.ts`/`server.ts` split.

After creating or editing, pages `navigate('/users/:id', { state: { message } })`. The details page
reads the message with `getFlashMessage(location.state)`, a type guard that safely narrows
`unknown`.

---

## Phase 6: Frontend testing

### Tools

- **Vitest** is the test runner (Jest-compatible API: `vi.fn` = `jest.fn`, `vi.mock` = `jest.mock`,
  `vi.spyOn` = `jest.spyOn`, `vi.mocked(fn)` = typed access to a mocked function).
- **jsdom** is a simulated browser DOM in Node (`environment: 'jsdom'` in `vite.config.ts`).
- **React Testing Library (RTL)** renders components and queries the DOM **the way users perceive it**.
- **user-event** simulates real typing and clicking (focus, key events, pointer events).
- **jest-dom** adds matchers like `toBeInTheDocument`, `toHaveValue`, `toBeDisabled`.

### Testing from the user's perspective

```ts
const { user } = renderApp('/users/new');                            // the whole app at a URL
await user.type(screen.getByLabelText('Name'), 'Alice Johnson');     // find by label, like a user
await user.click(screen.getByRole('button', { name: 'Create User' }));
expect(await screen.findByText('User created successfully.')).toBeInTheDocument();
```

Query priority: `getByRole` (with an accessible name) → `getByLabelText` → `getByText`. Avoid
`container.querySelector('.some-class')` and never assert on state variables or hook internals.
If you renamed `isSubmitting` to `busy`, no test should break. If the button stopped saying
"Saving...", one should.

- `getBy*` expects the element to be there **now** and throws if it isn't.
- `queryBy*` returns `null` if missing. Use it to assert something is **not** there.
- `findBy*` **waits** (up to 1s by default) for something to appear after async work. Use it after
  anything that triggers a request.

### Why the API is mocked in component tests

`vi.mock('../../src/services/userService')` **automocks** the module: every export becomes a
`vi.fn()`. Each test then decides what the "server" does:

```ts
vi.mocked(userService.getUsers).mockReturnValue(neverResolves());      // stuck loading
vi.mocked(userService.getUsers).mockResolvedValue([]);                 // empty state
vi.mocked(userService.getUsers).mockRejectedValue(new ApiRequestError('...', 0)); // error state
```

- **Speed and reliability:** no backend or database, no network, no flaky timing.
- **Control:** loading-forever, empty, 404 and 409 are one line each. With a real API they're
  painful to arrange.
- **Focus:** these tests answer "does the UI behave correctly given this response?" The backend
  suites already answer "does the API return the right response?"
- **Why mock the service and not Axios?** The service is the contract the components depend on.
  Mocking Axios would couple UI tests to URLs and response envelopes. That detail is tested once in
  `tests/unit/userService.test.ts`, which uses `vi.spyOn(apiClient, 'get')`.

The risk of mocking is that a mock can drift from the real API. That's exactly the gap an E2E test
(below) closes.

---

## Phase 7: CI/CD (`.github/workflows/user-management-ci.yml`)

```text
Developer pushes code
        ↓
GitHub receives the push / PR
        ↓
GitHub Actions starts two jobs in parallel (backend, frontend) on fresh Ubuntu machines
        ↓
checkout → setup Node 22 (with npm cache) → npm ci
        ↓
lint (ESLint) → format:check (Prettier)
        ↓
typecheck (tsc --noEmit / tsc -b)
        ↓
tests with coverage (Jest + in-memory MongoDB / Vitest)
        ↓
build
        ↓
Pass ✓  or  Fail ✗ (shown on the commit and PR; branch protection can block merging)
```

- **`npm ci`, not `npm install`:** installs exactly the lockfile, fails if `package.json` and the
  lockfile disagree, and never modifies them. That makes it reproducible.
- **Cheap checks go first:** lint and typecheck fail in seconds, and there's no point running tests on code
  that doesn't compile.
- **No MongoDB service in CI:** the tests bring their own. The `mongod` binary is cached between runs.
- **`paths` filter:** this repo contains other projects, so the workflow only runs when
  `user-management/**` changes. It lives at the repo root because GitHub only reads workflows from there.
- To reproduce CI locally, run the same scripts in each folder:
  `npm ci && npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build`.

---

## Testing philosophy: unit vs integration vs component vs E2E

| Kind            | Scope                                             | Speed   | Confidence it gives                       | Use it for                                          |
| --------------- | ------------------------------------------------- | ------- | ----------------------------------------- | --------------------------------------------------- |
| **Unit**        | one function; dependencies faked                  | ~ms     | "this logic is correct"                   | validators, business rules, edge cases, error mapping |
| **Integration** | several real pieces together (route → DB)         | ~10ms   | "these pieces work together"              | every API endpoint and its error cases              |
| **Component**   | a React page/component, API mocked                | ~50ms   | "the user sees and can do the right thing" | forms, loading/error/empty states, flows within the UI |
| **E2E**         | real browser + real frontend + real backend + DB  | seconds | "the product works"                       | a handful of critical journeys                      |

The usual shape is a **pyramid** (or "trophy"): many fast unit and component tests, a solid layer of
integration tests, and very few E2E tests. In _this_ project the backend integration tests carry the
most weight, because an API's behaviour is mostly about the pieces working together.

### Where E2E (Playwright / Cypress) would fit

Not implemented, because it would need both servers and a database running and adds a lot of setup
for a learning project. If you add it:

```text
e2e/
  users.spec.ts      // Playwright
```

```ts
test('create, edit and delete a user', async ({ page }) => {
  await page.goto('http://localhost:5173/');
  await page.getByRole('link', { name: 'Create User' }).click();
  await page.getByLabel('Name').fill('E2E User');
  // ... submit, assert the details page, edit, delete, assert it's gone
});
```

It would run in CI after the other jobs, with the backend started against a throwaway MongoDB (a
`services: mongo` container in the workflow) and the frontend built and served. Keep E2E to the few
journeys that would be embarrassing to break (create/edit/delete). Everything else is tested faster
lower down. Notice that RTL and Playwright share the same query style (`getByRole`, `getByLabel`), so
the habits you learn here carry over.

---

## TypeScript concepts used in this project

| Concept                    | Where                                                    | What to learn                                                                       |
| -------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `interface` vs `type`      | `IUser` (interface), `CreateUserRequest` (type)          | Interfaces for object shapes; `type` for unions and derived types.                  |
| Utility types              | `Pick<IUser, 'name' \| 'email' \| 'age'>`, `Partial<...>`, `Record<K, V>` | Derive types from one source of truth instead of copy-pasting fields. |
| Generics                   | `ApiSuccessResponse<T>`, `sendSuccess<T>`, `validateBody<T>`, `apiClient.get<T>` | One definition, many concrete types.                      |
| Discriminated unions       | `ValidationResult<T>`, `FieldResult<T>`                  | `if (!result.success)` narrows to the error branch, and TS knows `errors` exists.   |
| `unknown` + narrowing      | validators' `input: unknown`, `getFlashMessage(state: unknown)` | Untrusted data is `unknown`, not `any`: you must check before use.           |
| Type guards                | `isPlainObject(v): v is Record<string, unknown>`, `isDuplicateKeyError` | Teach the compiler what a runtime check proved.                     |
| `import type`              | everywhere types are imported                            | Type-only imports are erased at compile time (`verbatimModuleSyntax` enforces it on the frontend). |
| Typed Express handlers     | `Request<IdParams, unknown, UpdateUserRequest>`          | Gives `req.params.id` and `req.body` real types.                                    |
| `readonly`                 | `ApiError.statusCode`, `ApiRequestError.status`          | Values that must never change after construction.                                   |
| Type assertions (`as`)     | only in tests (fake `req`/`res`, mocked model)           | Legitimate when you knowingly build a partial fake; avoid in app code.              |
| No `any`                   | ESLint `no-explicit-any: error`                          | `unknown` + narrowing covers every case in this codebase.                           |

**Why types for requests and responses at all?** The frontend's `types/api.ts` mirrors the backend's
`api.types.ts`. If the backend changes the envelope, both sides have one obvious place to update,
and the compiler shows every place that depends on it.

---

## "Why?" quick reference

| Question                              | Short answer                                                                                           |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Why a service layer?                  | Business rules in one HTTP-free place: reusable, and unit-testable without `req`/`res`.                |
| Why separate `app.ts` / `server.ts`?  | Tests need a configured app, not a running server with a port and a DB connection.                    |
| Why Supertest?                        | Real HTTP through the real middleware stack, with no server to start or stop.                         |
| Why mock something?                   | To isolate the logic under test and force hard-to-produce situations quickly and deterministically.   |
| Why a real test database?             | Indexes, casting and query behaviour live in MongoDB. Mocks would only repeat your assumptions.       |
| Why `beforeEach`/`afterEach` cleanup? | Independent tests: any order, any subset, and a failure points at its own test.                        |
| Why `async/await`?                    | DB and HTTP calls are asynchronous. `await` reads top to bottom, and errors flow into `try/catch` or rejections. |
| Why interfaces/types?                 | Catch mistakes at compile time, document data shapes, get editor autocompletion.                       |
| Why centralized error handling?       | One consistent error format, no repeated `try/catch`, internals never leak to clients.                |
| Why an API service on the frontend?   | Components don't know URLs or HTTP. There's one place to change and one seam to mock.                 |
| Why validate on both sides?           | Frontend for instant feedback, backend because it is the only validation you can trust.               |

---

## Exercises (to check your understanding)

1. Add a `phone` field (optional, digits only). Touch: types → validation → model → tests → frontend
   types → form → table. Let the failing tests guide you.
2. Add `GET /api/users?search=jo` (name or email contains). Write the integration test **first**.
3. Delete the `ensureEmailIsAvailable` call in `createUser` and run the tests. Which fail, and why does
   the integration test _still_ get a 409? (Answer: the unique index plus the error handler.)
4. Change `app.ts` so `errorHandler` is registered **before** the routes. Which tests fail?
5. Add pagination (`?page=2&limit=10`) with `{ data, total, page }` in the response.
6. Add a Playwright E2E test for "create a user" following the sketch above.
