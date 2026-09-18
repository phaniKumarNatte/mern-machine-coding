    import { Router, Request, Response } from "express";
    import Product from "../models/Product.js";
    import { redisClient } from "../config/redis.js";

    const router = Router();

    router.get("/:id", async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        
        // 1. Check Redis
        // const cachedProduct = await redisClient.get(`product:${id}`);
        const cacheKey = `product:${id}`;

        const cachedProduct = await redisClient.get(cacheKey);

        console.log("CACHE KEY:", cacheKey);
        console.log("CACHE VALUE:", cachedProduct);

        // 2. Redis HIT
        if (cachedProduct) {
        console.log("Redis HIT");

        return res.json({
            source: "cache",
            data: JSON.parse(cachedProduct),
        });
        }

        // 3. Redis MISS
        console.log("Redis MISS");

        // 4. Get product from MongoDB
        const product = await Product.findById(id);

        if (!product) {
        return res.status(404).json({
            message: "Product not found",
        });
        }

        // 5. Save product in Redis
        await redisClient.set(
        `product:${id}`,
        JSON.stringify(product),
        {
            EX: 60, // cache for 60 seconds
        }
        );

        // 6. Return product
        return res.json({
        source: "mongodb",
        data: product,
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
        message: "Internal server error",
        });
    }
    });

    router.post("/", async (req: Request, res: Response) => {
  try {
    const { name, price, description } = req.body;

    const product = await Product.create({
      name,
      price,
      description,
    });

    return res.status(201).json({
      message: "Product created",
      data: product,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to create product",
    });
  }
});


    export default router;
