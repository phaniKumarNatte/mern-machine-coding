import "dotenv/config";
import express from "express";
import { connectRedis } from "./src/config/redis";
import rateLimiter from "./src/middleware/rateLimiter";

const app = express();


app.use(
  "/api/auth/login",
  rateLimiter(5, 60)
);

app.use(
  "/api/auth/otp",
  rateLimiter(3, 60)
);

app.use(
  "/api/products",
  rateLimiter(100, 60)
);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/auth/login", (_req, res) => {
  res.json({ message: "Login endpoint" });
});

app.get("/api/auth/otp", (_req, res) => {
  res.json({ message: "OTP endpoint" });
});

app.get("/api/products", (_req, res) => {
  res.json({ products: [] });
});

const port = Number(process.env.PORT ?? 3000);

const startServer = async () => {
  await connectRedis();
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
};

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exitCode = 1;
});

export default app;