import express from "express"; // express is a function provided by the Express library.
import mongoose from "mongoose";
import { redisClient } from "./config/redis.js";
import productRoutes from "./routes/productRoutes.js";

//const app = express() creates an Express application instance. We use this app object to configure middleware, define routes, and start the HTTP server.
const app = express();

// express.json() is built-in Express middleware that parses incoming JSON request bodies and makes the parsed data available through req.body.
app.use(express.json());

// app.use() is used to register middleware or mount routers in an Express application. It allows us to apply common processing or route handling to incoming requests.

app.use("/api/products", productRoutes);

async function startServer() {
  try {
    
    // Connect my Node.js application to the MongoDB running on my computer
    await mongoose.connect("mongodb://localhost:27017/cache-service");
    await redisClient.connect();

    // mongodb://localhost:27017/cache-service
    // │        │         │       │
    // │        │         │       └── Database
    // │        │         └────────── MongoDB port
    // │        └──────────────────── Your computer
    // └───────────────────────────── MongoDB protocol

    console.log("MongoDB connected");

    // Start the HTTP server and listen for requests on port 3000."
    // The callback in app.listen() is executed when the server has successfully started listening.
    app.listen(3000, () => {
      console.log("Server running on http://localhost:3000");
    });
  } catch (error) {
    console.error("Server error:", error);
  }
}
// An HTTP server is a program that listens for HTTP requests from clients, processes those requests, and sends HTTP responses back. In Node.js, Express helps us build APIs and handle those HTTP requests and responses.

startServer();
