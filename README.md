Title - MyEcommerceWebApplication

Core Functionalities and Structure:
👤 User Module
-Register
-Login (JWT authentication)
-Logout

🛍 Product Module
-Product listing
-Product details
-Category filter
-Search

🛒 Cart Module
-Add to cart
-Update quantity
-Remove item

📦 Order Module
-Place order
-Order history
-Order status

🛠 Admin Module 
-Add product
-Update product
-Delete product
-View orders

Payment (mimic real payment environment)
-Choose Payment method
-Make Payment (connect to stripe api)

Frontend - ReactJS
Backend - NodeJS + Express
Database - PostgreSQL 

API - Free Ecommerce Api https://kolzsticks.github.io/Free-Ecommerce-Products-Api/main/products.json
    - stripe api for payment

-npm run dev (Running front End) (Path in ecommerce-web)
-nodemon server.js (Running Back End) (Path in ecommerce-web/src)
