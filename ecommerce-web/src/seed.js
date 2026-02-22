// seed.js
import 'dotenv/config';
import { syncApiProducts } from './modules/products/products.services.js';

const runSeed = async () => {
  console.log("Starting sync...");
  const result = await syncApiProducts();
  console.log(result.message);
  process.exit();
};

runSeed();