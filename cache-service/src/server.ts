import express from "express";
import mongoose from "mongoose";
import { redisClient } from "./config/redis.js";
import productRoutes from "./routes/productRoutes.js";

const app = express();

app.use(express.json());

app.use("/api/products", productRoutes);

async function startServer() {
  try {
    await mongoose.connect("mongodb://localhost:27017/cache-service");
    await redisClient.connect();

// mongodb://localhost:27017/cache-service
// │        │         │       │
// │        │         │       └── Database
// │        │         └────────── MongoDB port
// │        └──────────────────── Your computer
// └───────────────────────────── MongoDB protocol

    console.log("MongoDB connected");

    app.listen(3000, () => {
      console.log("Server running on http://localhost:3000");
    });
  } catch (error) {
    console.error("Server error:", error);
  }
}

startServer();
