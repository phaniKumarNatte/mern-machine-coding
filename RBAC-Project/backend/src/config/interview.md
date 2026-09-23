What is Mongoose ?  
Mongoose is an ODM library for MongoDB and Node.js. It provides schemas and models and makes it easier to perform database operations from our Node.js application. It also provides features like validation, middleware, and convenient query methods. Mongoose is not mandatory because we can use the native MongoDB driver, but it helps structure and manage MongoDB interactions more easily

## what is process.exit
process.exit() terminates the Node.js process. An exit code of 0 normally indicates successful termination, while a non-zero exit code indicates an error or abnormal termination. However, for production servers, instead of immediately calling process.exit(), we usually perform graceful shutdown by stopping new requests, allowing existing requests to complete, closing database and other connections, and then exiting.

## npm & npx
npm (Node Package Manager) is used to install and manage dependencies in your project.  
npx (Node Package Execute) is used to execute/run packages directly without needing to permanently install them globally on your machine. When you run npx tsc --init, it temporarily fetches and runs the TypeScript compiler tool just for that single command

-------------

req.body = data sent by client
req.params = values extracted from URL
req.query = query-string values

For example:

POST /users
     ↓
req.body

GET /users/123
         ↓
      req.params.id

GET /users?page=2
         ↓
      req.query.page

--------------------
400 fields missed from client side
401 = Who are you?
403 = I know who you are, but you don't have permission.
404 = file not found in db

-------------------------

## Extend Express Request interface so TypeScript knows about req.user
export interface AuthRequest extends Request {
    user?: {
        userId: string;
        role: string;
    };
}

AuthRequest is a custom TypeScript interface that extends Express's Request interface. We use it because our authentication middleware adds a user property to req. It tells TypeScript that req.user can contain the authenticated user's userId and role, so we can safely use them in subsequent middleware and controllers

------------------------
400 Bad Request → The request from the client is invalid.
Example: required fields are missing, invalid JSON, or invalid input format.

401 Unauthorized → Authentication is missing or invalid.
Example: access token is not provided, expired, or invalid.

403 Forbidden → The user is authenticated, but does not have permission to perform the action.
Example: user exists and has a valid token, but doesn't have the required role/permission.

404 Not Found → The requested resource/data could not be found.
Example: user/product/order with the given ID doesn't exist in the database