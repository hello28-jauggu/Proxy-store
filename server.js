const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 8080;
const ADMIN_KEY = process.env.ADMIN_KEY || "change-this-key";

const dataDir = path.join(__dirname, "data");
const productsFile = path.join(dataDir, "products.json");
const ordersFile = path.join(dataDir, "orders.json");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const defaultProducts = [
  {
    id: "dc-1",
    name: "Datacenter Starter",
    type: "Datacenter",
    price: 5,
    duration: "7 days",
    stock: 50,
    description: "Fast datacenter proxy package."
  },
  {
    id: "isp-1",
    name: "ISP Standard",
    type: "ISP",
    price: 10,
    duration: "30 days",
    stock: 25,
    description: "Stable ISP proxy package."
  },
  {
    id: "res-1",
    name: "Residential Basic",
    type: "Residential",
    price: 15,
    duration: "30 days",
    stock: 15,
    description: "Residential proxy package from a compliant provider."
  }
];

function load(file, fallback) {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify(fallback, null, 2));
  }

  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function save(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/products", (req, res) => {
  res.json(load(productsFile, defaultProducts));
});

/*
  DEMO ORDER SYSTEM

  This does NOT process real payments.
  A real payment provider webhook should verify payment
  server-side before any proxy credentials are delivered.
*/
app.post("/api/orders", (req, res) => {
  const { productId, email } = req.body;

  if (!productId || !email || !email.includes("@")) {
    return res.status(400).json({
      error: "Valid product and email are required."
    });
  }

  const products = load(productsFile, defaultProducts);
  const product = products.find(p => p.id === productId);

  if (!product) {
    return res.status(404).json({
      error: "Product not found."
    });
  }

  if (product.stock <= 0) {
    return res.status(409).json({
      error: "Product is out of stock."
    });
  }

  product.stock--;

  const orders = load(ordersFile, []);

  const order = {
    id: "ORD-" + Date.now().toString(36).toUpperCase(),
    productId: product.id,
    productName: product.name,
    email,
    amount: product.price,
    status: "pending_payment",
    createdAt: new Date().toISOString()
  };

  orders.push(order);

  save(productsFile, products);
  save(ordersFile, orders);

  res.json({
    order,
    message:
      "Demo order created. Connect a payment provider before accepting real payments."
  });
});

function admin(req, res, next) {
  if (req.headers["x-admin-key"] !== ADMIN_KEY) {
    return res.status(401).json({
      error: "Unauthorized"
    });
  }

  next();
}

app.get("/api/admin/orders", admin, (req, res) => {
  res.json(load(ordersFile, []));
});

app.post("/api/admin/products", admin, (req, res) => {
  const products = load(productsFile, defaultProducts);

  const product = {
    id: String(req.body.id),
    name: String(req.body.name),
    type: String(req.body.type),
    price: Number(req.body.price),
    duration: String(req.body.duration),
    stock: Number(req.body.stock),
    description: String(req.body.description || "")
  };

  if (
    !product.id ||
    !product.name ||
    !product.type ||
    !Number.isFinite(product.price)
  ) {
    return res.status(400).json({
      error: "Invalid product."
    });
  }

  const index = products.findIndex(p => p.id === product.id);

  if (index >= 0) {
    products[index] = product;
  } else {
    products.push(product);
  }

  save(productsFile, products);

  res.json(product);
});

app.delete("/api/admin/products/:id", admin, (req, res) => {
  const products = load(productsFile, defaultProducts)
    .filter(p => p.id !== req.params.id);

  save(productsFile, products);

  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Proxy Store running on port ${PORT}`);
});