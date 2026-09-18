import { createClient } from "redis";

const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";

const redisClient = createClient({
  url: redisUrl,
  RESP: 2,
  socket: {
    connectTimeout: 5000,
    reconnectStrategy: false,
  },
});

redisClient.on("error", (err) => {
  console.error("Redis Error:", err);
});

export const connectRedis = async () => {
  if (!redisClient.isOpen) {
    await redisClient.connect();
    console.log("Redis connected");
  }
};

export default redisClient;