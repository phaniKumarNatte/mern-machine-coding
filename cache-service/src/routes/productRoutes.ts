    import { Router, Request, Response } from "express";
    import Product from "../models/Product.js";
    import { redisClient } from "../config/redis.js";

    // Router() creates routing object in Express. We use it to define and organize related routes separately from the main Express application, and then mount that router using app.use().
    const router = Router();

    router.get("/:id", async (req: Request, res: Response) => {
      try {
          const { id } = req.params;
          
          // 1. Check Redis
          const cacheKey = `product:${id}`;

          const cachedProduct = await redisClient.get(cacheKey);

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


router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, price, description } = req.body;

    const product = await Product.findByIdAndUpdate(
      id,
      { name, price, description },
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    // Invalidate cache
    await redisClient.del(`product:${id}`);

    return res.json({
      message: "Product updated",
      data: product,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to update product",
    });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const product = await Product.findByIdAndDelete(id);

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    // Invalidate cache
    await redisClient.del(`product:${id}`);

    return res.json({
      message: "Product deleted",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to delete product",
    });
  }
});

export default router;
