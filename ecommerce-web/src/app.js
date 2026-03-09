import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from "./modules/auth/auth.routes.js";
import productsRoutes from "./modules/products/products.routes.js";
import cartRoutes from "./modules/cart/cart.routes.js";
import categoriesRoutes from "./modules/categories/categories.routes.js";
import ordersRoutes from "./modules/orders/orders.routes.js";
import reviewsRoutes, { userReviewsRoutes } from "./modules/reviews/reviews.routes.js";
import addressesRoutes from "./modules/addresses/addresses.routes.js";
import paymentRouter from "./modules/payments/payment.routes.js";
import chatRouter from "./modules/chatbot/chatbot.routes.js";

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// backend/app.js
import helmet from "helmet";

app.use(helmet({
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  crossOriginEmbedderPolicy: false, // Often needed for Google scripts to load
}));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/cart",cartRoutes);
app.use("/api/orders",ordersRoutes);
app.use("/api/reviews", reviewsRoutes);        // Standalone review routes
app.use("/api/users/:userId/reviews", userReviewsRoutes); // User's reviews
app.use("/api/users/:userId/addresses", addressesRoutes);  // User's addresses
app.use("/api/payments", paymentRouter);
app.use("/api/chatbot", chatRouter);
// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'E-commerce API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      products: '/api/products',
      categories: '/api/categories'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

export default app;