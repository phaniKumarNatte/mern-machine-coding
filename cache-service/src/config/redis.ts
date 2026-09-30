import { createClient } from "redis";

export const redisClient = createClient({
  socket: {
    host: "127.0.0.1",
    port: 6379,
  },
});

// createClient() creates a Redis client configured to connect to the Redis server running on my computer. That client is stored in the redisClient variable, so I can use that variable to interact with my computer's Redis — set data, get data, delete data, etc.

// For example:

// await redisClient.connect();

// await redisClient.set("name", "John"); // store
// await redisClient.get("name");         // get
// await redisClient.del("name");         // delete

redisClient.on(
  "connect",          // WHEN this event happens
  () => {             // THEN run this function
    console.log("Redis connected");
  }
);

// .on() = register/listen for an event

// .on("event", callback)
//      ↓         ↓
//    WHAT       WHAT TO DO
//   happened   when it happens


redisClient.on("ready", () => {
  console.log("Redis ready");
});

redisClient.on("error", (error) => {
  console.error("Redis error:", error);
});
