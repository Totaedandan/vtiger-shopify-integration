Shopify API Integration with VTiger (Remix)
This project integrates the Shopify Admin API with VTiger CRM using Remix, a full-stack React framework. It fetches orders, customers, and products from Shopify and formats the data for synchronization with VTiger.
Features

Fetches Shopify orders, customers, and products via GraphQL API (version 2025-04).
Formats data for seamless integration with VTiger CRM.
Built with Remix for server-side rendering and API routes.

Prerequisites
Before you begin, ensure you have the following:

Node.js (version 20.x or higher recommended).
npm (version 9.x or higher).
A Shopify store with Admin API access:
Required scopes: read_orders, read_customers, read_products.


A VTiger CRM instance (optional, for full integration).

Installation

Clone the repository:
git clone https://github.com/Totaedandan/vtiger-shopify-integration.git
cd vtiger-shopify-integration/my-remix-app


Install dependencies:
npm install


Set up environment variables:
Create a .env file in the project root (my-remix-app/) and add the following:
PORT=3000
SHOPIFY_STORE_DOMAIN=your-shopify-store.myshopify.com
SHOPIFY_ADMIN_ACCESS_TOKEN=your_shopify_admin_access_token


Replace your-shopify-store.myshopify.com with your Shopify store domain.
Replace your_shopify_admin_access_token with your Shopify Admin API token (starts with shpat_).



Running the Project Locally

Start the development server:
npm run dev

The app will be available at http://localhost:5173.

Test API routes:

Orders:curl http://localhost:5173/api/shopify/orders?limit=5


Customers:curl http://localhost:5173/api/shopify/customers?limit=5


Products:curl http://localhost:5173/api/shopify/products?limit=5





Building for Production

Build the project:
npm run build


Start the production server:
npm start

The app will run on the port specified in .env (default: 3000).


Deployment
To deploy the app on a VPS, follow these steps:

Set up a VPS with Ubuntu 22.04 LTS, 2 vCPUs, 4 GB RAM, and 50 GB SSD (recommended).

Install Node.js, npm, and a web server (e.g., Nginx).

Clone the repository, install dependencies, and copy the .env file.

Build and run the app:
npm run build
npm start

Alternatively, use pm2 for process management:
npm install -g pm2
pm2 start npm --name "remix-app" -- run start


Configure Nginx as a reverse proxy to forward requests to the app.


API Endpoints

/api/shopify/orders?limit=<number>&after=<cursor>: Fetch Shopify orders.
/api/shopify/customers?limit=<number>&after=<cursor>: Fetch Shopify customers.
/api/shopify/products?limit=<number>&after=<cursor>: Fetch Shopify products.

Project Structure

app/routes/api.shopify.*.jsx: API routes for fetching Shopify data.
server.mjs: Production server configuration.
vite.config.ts: Vite configuration for development and build.

Troubleshooting

Fetch failed errors: Ensure your Shopify API token is valid and has the required scopes (read_orders, read_customers, read_products).
Environment variables not loading: Verify that the .env file is in the correct directory (my-remix-app/) and contains the correct values.
GraphQL errors: Check the Shopify GraphQL API schema (version 2025-04) to ensure the queries match the schema.

License
This project is licensed under the MIT License (or specify your license).
Contributing
Feel free to submit issues or pull requests if you have suggestions or improvements. Contributions are welcome!
