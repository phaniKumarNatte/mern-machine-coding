const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());

const products = Array.from({ length: 47 }, (_, index) => ({
  _id: String(index + 1),
  name: `Product ${index + 1}`,
}));

app.get("/api/products", (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;

  const start = (page - 1) * limit;
  const end = start + limit;

  const pageProducts = products.slice(start, end);

  const hasMore = end < products.length;

  res.json({
    products: pageProducts,
    hasMore,
  });
});

app.listen(5000, () => {
  console.log("API running on http://localhost:5000");
});
