import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const requiredEnvVars = [
  'SHOPIFY_STORE_DOMAIN',
  'SHOPIFY_ADMIN_ACCESS_TOKEN',
];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Ошибка: Переменная ${envVar} не задана в .env`);
    process.exit(1);
  }
}

const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const SHOPIFY_ADMIN_ACCESS_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
const API_VERSION = process.env.SHOPIFY_API_VERSION || '2025-04';

const WEBHOOK_URL = 'https://1ae8-173-244-158-222.ngrok-free.app/webhook';

const WEBHOOK_TOPICS = [
  'orders/create',
  'orders/cancelled',
  'orders/edited',
  'orders/fulfilled',
  'orders/paid',
  'orders/updated',
];

async function getExistingWebhooks() {
  const response = await fetch(
    `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${API_VERSION}/webhooks.json`,
    {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_ADMIN_ACCESS_TOKEN,
        'Content-Type': 'application/json',
      },
    }
  );
  const data = await response.json();
  return data.webhooks;
}

async function deleteWebhook(id) {
  const response = await fetch(
    `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${API_VERSION}/webhooks/${id}.json`,
    {
      method: 'DELETE',
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_ADMIN_ACCESS_TOKEN,
        'Content-Type': 'application/json',
      },
    }
  );
  if (response.ok) {
    console.log(`Удалён вебхук ${id}`);
  } else {
    console.error(`Ошибка удаления вебхука ${id}:`, await response.text());
  }
}

async function createWebhook(topic) {
  const response = await fetch(
    `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${API_VERSION}/webhooks.json`,
    {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_ADMIN_ACCESS_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        webhook: {
          topic: topic,
          address: WEBHOOK_URL,
          format: 'json',
        },
      }),
    }
  );
  const data = await response.json();
  if (response.ok) {
    console.log(`Создан вебхук ${topic}:`, data);
  } else {
    console.error(`Ошибка создания вебхука ${topic}:`, data);
  }
}

async function main() {
  try {
    // Удаляем существующие вебхуки
    const existingWebhooks = await getExistingWebhooks();
    console.log('Существующие вебхуки:', existingWebhooks);
    for (const webhook of existingWebhooks) {
      await deleteWebhook(webhook.id);
    }

    // Создаём новые вебхуки
    for (const topic of WEBHOOK_TOPICS) {
      await createWebhook(topic);
    }
    console.log('Все вебхуки успешно созданы через REST API');
  } catch (error) {
    console.error('Ошибка:', error.message);
  }
}

main();