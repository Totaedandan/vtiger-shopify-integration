# 🛠️ Shopify API Integration with VTiger (Remix)

This project integrates the **Shopify Admin API** with **VTiger CRM** using [Remix](https://remix.run/), a full-stack React framework. It fetches **orders, customers, and products** from Shopify and formats the data for seamless synchronization with VTiger.

---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

## ✨ Features

- Fetches Shopify **orders**, **customers**, and **products** via **GraphQL API (2025-04)**.
- Formats data for integration with **VTiger CRM**.
- Built with **Remix** for server-side rendering and API route handling.

---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

## ✅ Prerequisites

Before you begin, make sure you have the following installed and configured:

- **Node.js** (v20.x or higher recommended)  
- **npm** (v9.x or higher)  
- A **Shopify store** with Admin API access  
  - Required API scopes:
    - `read_orders`
    - `read_customers`
    - `read_products`
- A **VTiger CRM** instance (optional, for full integration)

---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

## 📦 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/Totaedandan/vtiger-shopify-integration.git
cd vtiger-shopify-integration/my-remix-app
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Environment Variables

Create a `.env` file in the project root (`my-remix-app/`) with the following content:

```env
PORT=3000
SHOPIFY_STORE_DOMAIN=your-shopify-store.myshopify.com
SHOPIFY_ADMIN_ACCESS_TOKEN=your_shopify_admin_access_token
```

> 🔁 Replace `your-shopify-store.myshopify.com` with your actual store domain.  
> 🔐 Replace `your_shopify_admin_access_token` with your Admin API token (starts with `shpat_`).

---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

## 🧪 Running Locally

Start the development server:

```bash
npm run dev
```

The app will be available at: [http://localhost:5173](http://localhost:5173)

---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

## 🔌 Test API Routes

Use `curl` or your preferred API tool:

- **Orders**  
  ```bash
  curl http://localhost:5173/api/shopify/orders?limit=5
  ```

- **Customers**  
  ```bash
  curl http://localhost:5173/api/shopify/customers?limit=5
  ```

- **Products**  
  ```bash
  curl http://localhost:5173/api/shopify/products?limit=5
  ```

---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

## 🚀 Building for Production

### 1. Build the Project

```bash
npm run build
```

### 2. Start the Production Server

```bash
npm start
```

> App will run on the port defined in `.env` (default: `3000`).

---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

## 📡 Deployment Guide (Ubuntu VPS)

1. Set up a VPS (Recommended: Ubuntu 22.04 LTS, 2 vCPUs, 4 GB RAM, 50 GB SSD).
2. Install **Node.js**, **npm**, and a web server like **Nginx**.
3. Clone the repo and install dependencies.
4. Copy your `.env` file.
5. Build and start the app:

```bash
npm run build
npm start
```

### ✅ (Optional) Use PM2 for Process Management

```bash
npm install -g pm2
pm2 start npm --name "remix-app" -- run start
```

### 🌐 Nginx Reverse Proxy Setup

Configure **Nginx** to forward HTTP requests to your app.

---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

## 📊 API Endpoints

| Endpoint | Description |
|----------|-------------|
| `/api/shopify/orders?limit=<number>&after=<cursor>` | Fetch Shopify orders |
| `/api/shopify/customers?limit=<number>&after=<cursor>` | Fetch Shopify customers |
| `/api/shopify/products?limit=<number>&after=<cursor>` | Fetch Shopify products |

---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

## 🧱 Project Structure

```
my-remix-app/
├── app/
│   └── routes/
│       └── api.shopify.*.jsx     # API routes
├── server.mjs                    # Production server setup
├── vite.config.ts                # Vite configuration
└── .env                          # Environment variables
```

---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

## 🛠️ Troubleshooting

- **Fetch failed errors**: Check that your API token is valid and has required scopes.
- **.env not loading**: Ensure it’s in the root folder (`my-remix-app/`) and correctly formatted.
- **GraphQL errors**: Refer to the [Shopify GraphQL Admin API schema](https://shopify.dev/docs/api/admin-graphql/2025-04) for updates and query structure.

---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

## 📄 License

This project is licensed under the **MIT License** (or specify your preferred license).

---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

## 🤝 Contributing

Contributions are welcome! Feel free to open issues or submit pull requests with improvements or suggestions.
