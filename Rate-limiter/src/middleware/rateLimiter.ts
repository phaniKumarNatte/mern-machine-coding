import type { NextFunction, Request, Response } from "express";
import redisClient from "../config/redis";

export const rateLimiter = (
  maxRequests: number,
  windowSeconds: number
) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const ip = req.ip ?? "unknown";

      const key = `rate-limit:${req.baseUrl}:${ip}`;

      const count = await redisClient.incr(key);

      if (count === 1) {
        await redisClient.expire(key, windowSeconds);
      }

      if (count > maxRequests) {
        return res.status(429).json({
          success: false,
          message: "Too many requests",
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

export default rateLimiter;