# User Management (MERN + TypeScript)

A small but production-style full-stack CRUD application, built as a **learning project**.
The UI is intentionally plain. The point is the structure: how a real Express + MongoDB API and
a React app are organised, and above all **how each part is tested**.

> New here? Read this README for setup, then follow [docs/LEARNING_GUIDE.md](docs/LEARNING_GUIDE.md)
> file by file.

---

## 1. Project overview

Users can be **created, listed, viewed, updated and deleted**. Each user looks like:

```ts
{
  _id: string;
  name: string;      // required, max 100 characters
  email: string;     // required, valid format, unique (case-insensitive)
  age: number;       // required, whole number 0–150
  createdAt: Date;
  updatedAt: Date;
}
```

| Part     | What it does                                                            | Tests                                                      |
| -------- | ----------------------------------------------------------------------- | ---------------------------------------------------------- |
| Backend  | REST API: validation, business rules, centralized errors, MongoDB       | 66 Jest tests: unit + Supertest integration (in-memory DB) |
| Frontend | React pages for list/create/view/edit/delete, loading and error states  | 33 Vitest + React Testing Library tests                    |
| CI       | GitHub Actions: install → lint → format → typecheck → test → build      | runs both suites on every push/PR                          |

## 2. Tech stack

| Layer            | Tools                                                                                   |
| ---------------- | --------------------------------------------------------------------------------------- |
| Backend runtime  | Node.js 20+ (built with 22), Express 5, TypeScript, Mongoose 9, MongoDB, dotenv, cors   |
| Backend testing  | Jest, ts-jest, Supertest, mongodb-memory-server                                          |
| Frontend         | React 19, TypeScript, Vite, React Router 7, Axios, plain CSS                             |
| Frontend testing | Vitest (Jest-compatible API), jsdom, React Testing Library, user-event, jest-dom         |
| Code quality     | ESLint (flat config + typescript-eslint), Prettier                                       |
| CI               | GitHub Actions (`.github/workflows/user-management-ci.yml` at the repository root)       |

**Why Vitest on the frontend instead of Jest?** You asked for "Jest or the appropriate modern
Jest-compatible setup". Vitest reuses `vite.config.ts`, understands TypeScript/JSX/`import.meta.env`
with zero extra config, and its API is the same as Jest's (`describe`, `it`, `expect`, `vi.fn()` ≈
`jest.fn()`, `vi.mock()` ≈ `jest.mock()`, `vi.spyOn()` ≈ `jest.spyOn()`). Making Jest work with
Vite needs Babel or ts-jest plus workarounds for `import.meta`, which is extra complexity with nothing
to learn from it. The backend uses real Jest, so you see both.

## 3. Folder structure

```text
user-management/
├── README.md                     ← you are here
├── docs/
│   └── LEARNING_GUIDE.md         ← the step-by-step study guide
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── env.ts            loads .env, exposes typed config, fails fast if missing
│   │   │   └── database.ts       connect / disconnect Mongoose
│   │   ├── types/
│   │   │   ├── user.types.ts     IUser, CreateUserRequest, UpdateUserRequest
│   │   │   └── api.types.ts      ApiSuccessResponse<T>, ApiErrorResponse, ValidationResult<T>
│   │   ├── utils/
│   │   │   ├── ApiError.ts       Error subclass that carries an HTTP status code
│   │   │   ├── apiResponse.ts    sendSuccess(): the standard success envelope
│   │   │   └── validation.ts     pure request-body validators
│   │   ├── models/
│   │   │   └── user.model.ts     Mongoose schema + model (unique email index, timestamps)
│   │   ├── services/
│   │   │   └── user.service.ts   business rules; no HTTP knowledge
│   │   ├── controllers/
│   │   │   └── user.controller.ts  req → service → res
│   │   ├── middleware/
│   │   │   ├── validateBody.ts       runs a validator on req.body
│   │   │   ├── validateObjectId.ts   400 for malformed :id
│   │   │   ├── notFoundHandler.ts    404 for unknown routes
│   │   │   └── errorHandler.ts       the ONE place errors become HTTP responses
│   │   ├── routes/
│   │   │   └── user.routes.ts    URL + method → middleware chain → controller
│   │   ├── app.ts                builds the Express app (NO listen)
│   │   └── server.ts             connects DB + app.listen() (never imported by tests)
│   ├── tests/
│   │   ├── helpers/
│   │   │   ├── testDb.ts         start/clear/stop in-memory MongoDB
│   │   │   └── userFactory.ts    test data builders
│   │   ├── unit/                 validation, service (mocked model), controller (spied service), errorHandler
│   │   └── integration/          Supertest against the real app + in-memory MongoDB
│   ├── .env.example
│   ├── eslint.config.mjs  .prettierrc
│   ├── jest.config.ts
│   ├── tsconfig.json             type-checks src + tests
│   ├── tsconfig.build.json       compiles only src → dist
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── types/                User, CreateUserRequest, API envelope types
    │   ├── services/
    │   │   ├── apiClient.ts      configured Axios instance + error interceptor
    │   │   ├── apiError.ts       ApiRequestError (the only error type the UI sees)
    │   │   └── userService.ts    getUsers/getUser/createUser/updateUser/deleteUser
    │   ├── hooks/
    │   │   ├── useUsers.ts       list + delete state (loading/error/data)
    │   │   └── useUser.ts        single user state
    │   ├── components/           UserForm, UserTable, ConfirmDialog, LoadingSpinner, ErrorMessage, Layout
    │   ├── pages/                UsersListPage, CreateUserPage, ViewUserPage, EditUserPage, NotFoundPage
    │   ├── utils/                form validation/conversion, date formatting, error messages, flash messages
    │   ├── App.tsx               route table
    │   ├── main.tsx              browser entry point (BrowserRouter)
    │   └── index.css
    ├── tests/
    │   ├── setup.ts              jest-dom matchers + cleanup
    │   ├── testUtils.tsx         renderApp(url), buildUser(), neverResolves()
    │   ├── pages/                component tests per page (user's perspective)
    │   └── unit/                 pure functions + service layer
    ├── .env.example
    ├── eslint.config.js  .prettierrc
    ├── vite.config.ts            dev server + proxy + Vitest config
    ├── tsconfig*.json
    └── package.json
```

## 4. Installation

Prerequisites: **Node.js 20 or newer** and npm. MongoDB is only needed to _run_ the app, not to test it.

```bash
cd user-management/backend
npm install

cd ../frontend
npm install
```

## 5. Configuring MongoDB

Pick one:

- **Local MongoDB**: install [MongoDB Community](https://www.mongodb.com/try/download/community) and
  keep the default `MONGODB_URI=mongodb://127.0.0.1:27017/user-management`.
- **Docker**: `docker run -d --name mongo -p 27017:27017 mongo:8` and keep the same URI.
- **MongoDB Atlas (cloud)**: create a free cluster, add your IP to the access list, create a database
  user, and use the `mongodb+srv://<user>:<password>@<cluster>/user-management` connection string.

You don't need to create the database or collection. MongoDB creates both on the first insert,
and Mongoose builds the unique index on `email` when the app starts.

**Tests never use this database.** They start their own throwaway in-memory MongoDB (see
[Testing strategy](#13-testing-strategy)). The first test run downloads a `mongod` binary of about
80 MB into `~/.cache/mongodb-binaries`; after that it's instant.

## 6. Environment variables

```bash
cd backend
cp .env.example .env    # then edit .env
```

| Variable      | Used by  | Default                   | Meaning                                         |
| ------------- | -------- | ------------------------- | ----------------------------------------------- |
| `NODE_ENV`    | backend  | `development`             | `development` / `production` / `test`           |
| `PORT`        | backend  | `5000`                    | HTTP port of the API                            |
| `MONGODB_URI` | backend  | none, **required**        | MongoDB connection string                       |
| `CLIENT_URL`  | backend  | `http://localhost:5173`   | Origin allowed by CORS                          |
| `VITE_API_URL`| frontend | `/api` (proxied by Vite)  | Base URL of the API. Only needed in production  |

How it works:

- `dotenv` reads `backend/.env` at startup and copies each line into `process.env`. Variables that
  already exist in the real environment win, which is how CI and hosting platforms inject secrets.
- `.env` is **git-ignored** (it may hold passwords). `.env.example` is committed so everyone knows
  which variables exist.
- In the frontend, Vite exposes only variables prefixed with `VITE_` through `import.meta.env`, and
  inlines them into the JavaScript bundle at build time. **Anything in a `VITE_` variable is
  public.** Never put secrets there.

## 7. Running the backend

```bash
cd backend
npm run dev        # tsx watch: restarts on every file change
# API on http://localhost:5000, health check at http://localhost:5000/api/health

npm run build      # compile TypeScript → dist/
npm start          # run the compiled build (what production would do)
```

## 8. Running the frontend

```bash
cd frontend
npm run dev        # http://localhost:5173
npm run build      # type-check + production bundle in dist/
npm run preview    # serve the production bundle locally
```

Start the backend first. In development the browser calls `http://localhost:5173/api/...` and
Vite's proxy forwards it to `http://localhost:5000/api/...`, so there are no CORS problems and no
hard-coded API URLs.

## 9–11. Running tests (all modes)

| Command                     | Backend (Jest)                         | Frontend (Vitest)             |
| --------------------------- | -------------------------------------- | ----------------------------- |
| `npm test`                  | all tests once                         | all tests once                |
| `npm run test:watch`        | re-runs tests related to changed files | re-runs on change             |
| `npm run test:coverage`     | coverage report in `coverage/`         | coverage report in `coverage/`|
| `npm run test:unit`         | only `tests/unit`                      | none                          |
| `npm run test:integration`  | only `tests/integration`               | none                          |

Run a single file or a single test by name:

```bash
npx jest tests/unit/user.service.test.ts         # backend, one file
npx jest -t "returns 409"                        # backend, tests whose name matches
npx vitest run tests/pages/CreateUserPage.test.tsx   # frontend, one file
```

Open `coverage/lcov-report/index.html` (backend) or `coverage/index.html` (frontend) in a browser
to see line-by-line coverage.

Other quality commands (both projects): `npm run lint`, `npm run lint:fix`, `npm run typecheck`,
`npm run format`, `npm run format:check`.

## 12. API endpoints

Base URL: `http://localhost:5000/api`. All bodies are JSON.

**Every response uses one of two envelopes:**

```jsonc
// success
{ "success": true, "message": "optional human message", "data": <payload> }

// failure
{ "success": false, "message": "What went wrong", "errors": [ { "field": "email", "message": "..." } ] }
//                                                  ^ only present for validation errors
```

| Method | Path             | Body                           | Success          | Errors                               |
| ------ | ---------------- | ------------------------------ | ---------------- | ------------------------------------ |
| GET    | `/health`        | none                           | 200              | none                                 |
| POST   | `/users`         | `{ name, email, age }` (all)   | **201** + user   | 400 validation · 409 duplicate email |
| GET    | `/users`         | none                           | 200 + user[]     | none                                 |
| GET    | `/users/:id`     | none                           | 200 + user       | 400 invalid id · 404 not found       |
| PUT    | `/users/:id`     | any of `{ name, email, age }`  | 200 + user       | 400 · 404 · 409                      |
| DELETE | `/users/:id`     | none                           | 200 + deleted user | 400 · 404                          |
| any    | unknown route    | none                           | none             | 404                                  |

Notes:

- `GET /users` returns newest first.
- Emails are trimmed and lower-cased, so `John@Example.com` and `john@example.com` are duplicates.
- Unknown body fields (e.g. `"role": "admin"`, `"_id"`) are silently dropped, which protects against
  mass assignment.
- `PUT` accepts partial updates, but at least one field is required and every field sent must be
  valid.
- Malformed JSON returns `400 "Request body contains invalid JSON"`. Unexpected failures return
  `500 "Internal server error"` and the real error is only logged on the server.

Examples:

```bash
curl -X POST http://localhost:5000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"John","email":"john@example.com","age":25}'
# 201 {"success":true,"message":"User created successfully","data":{"_id":"...","name":"John",...}}

curl -X POST http://localhost:5000/api/users -H "Content-Type: application/json" -d '{"email":"bad"}'
# 400 {"success":false,"message":"Validation failed","errors":[
#       {"field":"name","message":"Name is required"},
#       {"field":"email","message":"Email must be a valid email address"},
#       {"field":"age","message":"Age is required"}]}

curl http://localhost:5000/api/users/123
# 400 {"success":false,"message":"Invalid user ID"}

curl -X PUT http://localhost:5000/api/users/<id> -H "Content-Type: application/json" -d '{"age":26}'
curl -X DELETE http://localhost:5000/api/users/<id>
```

## 13. Testing strategy

| Kind                      | What it proves                                                        | Real parts                                         | Mocked parts                    | Where                                  |
| ------------------------- | --------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------- | -------------------------------------- |
| **Unit** (backend)        | one function's logic and decisions                                    | the function                                       | its dependencies (model, service, `req`/`res`) | `backend/tests/unit`   |
| **Integration** (backend) | the HTTP API really works with a real database                        | Express, middleware, controller, service, Mongoose, MongoDB | nothing                  | `backend/tests/integration` |
| **Component** (frontend)  | a user can see and do the right things on each page                   | React, router, components, hooks, form logic       | the API service module          | `frontend/tests/pages`                 |
| **Unit** (frontend)       | pure helpers + the service's HTTP calls                               | the function                                       | Axios method (spy)              | `frontend/tests/unit`                  |
| **End-to-end**            | the deployed stack works in a real browser                            | everything                                         | nothing                         | not implemented (see guide)            |

**When to mock, and when to use the real thing:**

- **Mock** when you want to test _your_ decision logic in isolation, force situations that are hard to
  reproduce (DB connection lost, server returns 409), or keep a test fast and deterministic. Example:
  `user.service.test.ts` mocks the `User` model to check that a taken email throws 409 **and never
  calls `create`**.
- **Use the real thing** when the behaviour lives in the dependency itself: unique indexes, ObjectId
  casting, Mongoose validation, Express middleware order, JSON parsing. Mocks would only repeat
  what you already _believe_ happens. Example: the integration test that inserts the same email
  twice proves the unique index actually exists.
- Frontend component tests mock the **service module**, not Axios or `fetch`. That's the boundary the
  components depend on, it keeps tests independent of HTTP details, and the backend has its own tests.

The detailed explanation (hooks, `jest.fn` vs `jest.spyOn` vs `jest.mock`, the test database
lifecycle, E2E) is in [docs/LEARNING_GUIDE.md](docs/LEARNING_GUIDE.md#phase-4--backend-testing).

## 14. Architecture

### Backend request flow

```text
HTTP request
   ↓
app.ts            global middleware: cors → express.json()
   ↓
user.routes.ts    POST /api/users → [validateBody(validateCreateUser), createUser]
   ↓
middleware        validateObjectId / validateBody   ── invalid? next(ApiError 400) ──┐
   ↓                                                                                   │
controller        reads req, calls service, sends 2xx with sendSuccess()               │
   ↓                                                                                   │
service           business rules (duplicate email → throw ApiError 409, missing → 404) ─┤
   ↓                                                                                   │
model (Mongoose)  schema validation, unique index, casting ── throws? ─────────────────┤
   ↓                                                                                   │
MongoDB                                                                                ↓
                                                         errorHandler.ts → { success:false, message } + status
```

### Error flow

```text
Service:  throw ApiError.notFound('User not found')        (or Mongoose/Mongo throws)
   ↓
Controller: `await userService.getUserById(id)` rejects, and it doesn't catch
   ↓
Express 5: a rejected async handler is forwarded automatically, like next(err)
   ↓
errorHandler(err, req, res, next): toApiError(err) maps it
     ApiError             → its own status
     Mongoose ValidationError → 400 + field errors
     CastError            → 400
     Mongo code 11000     → 409
     JSON SyntaxError     → 400
     anything else        → 500 "Internal server error" (+ console.error)
   ↓
HTTP response: { "success": false, "message": "User not found" }  status 404
```

### Frontend data flow

```text
Page component (UsersListPage)
   ↓ calls
Hook (useUsers)             holds loading / error / data state
   ↓ calls
API service (userService)   knows URLs and unwraps { success, data }
   ↓ uses
apiClient (Axios)           base URL, JSON headers, converts errors → ApiRequestError
   ↓ HTTP
Vite proxy (/api) → Express API
```

### CI/CD flow

```text
git push / pull request
   ↓
GitHub triggers .github/workflows/user-management-ci.yml (only if user-management/** changed)
   ↓
two parallel jobs on fresh Ubuntu VMs: backend and frontend
   ↓
checkout → setup Node 22 (npm cache) → npm ci → lint → format:check → typecheck → test:coverage → build
   ↓
any step fails ⇒ job fails ⇒ red ✗ on the commit/PR (merge can be blocked with branch protection)
all green      ⇒ ✓
```

This is CI (continuous integration). CD (deployment) would be one more job that runs only on `main`
after both jobs pass, for example building a Docker image and deploying it. It's left out on purpose.
