// Install first: npm install dotenv
import 'dotenv/config'; 

// Use process.env, NOT import.meta.env
console.log("Client ID:", process.env.VITE_GOOGLE_CLIENT_ID);