import { Shopify } from '@shopify/shopify-api';
import dotenv from 'dotenv';

dotenv.config();

// Проверяем переменные окружения
const requiredEnvVars = [
  'SHOPIFY_STORE_DOMAIN',
  'SHOPIFY_ADMIN_ACCESS_TOKEN',
  'SHOPIFY_API_SECRET',
];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Ошибка: Переменная ${envVar} не задана в .env`);
    process.exit(1);
  }
}

// Инициализация Shopify API
const shopify = Shopify({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET,
  adminApiAccessToken: process.env.SHOPIFY_ADMIN_ACCESS_TOKEN,
  hostName: process.env.SHOPIFY_STORE_DOMAIN.replace('https://', ''),
  apiVersion: process.env.SHOPIFY_API_VERSION || '2024-07',
});

const client = shopify.clients.Graphql({
  session: {
    shop: process.env.SHOPIFY_STORE_DOMAIN,
    accessToken: process.env.SHOPIFY_ADMIN_ACCESS_TOKEN,
  },
});

const WEBHOOK_URL = 'https://1ae8-173-244-158-222.ngrok-free.app/webhook';

const WEBHOOK_TOPICS = [
  'ORDERS_CREATE',
  'ORDERS_CANCELLED',
  'ORDERS_EDITED',
  'ORDERS_FULFILLED',
  'ORDERS_PAID',
  'ORDERS_UPDATED',
];

async function getExistingWebhooks() {
  const query = `
    query {
      webhookSubscriptions(first: 100) {
        edges {
          node {
            id
            topic
            endpoint {
              ... on WebhookHttpEndpoint {
                callbackUrl
              }
            }
          }
        }
      }
    }
  `;
  try {
    const response = await client.query({ data: query });
    return response.body.data.webhookSubscriptions.edges;
  } catch (error) {
    throw new Error(`Ошибка получения вебхуков: ${error.message}`);
  }
}

async function deleteWebhook(id) {
  const mutation = `
    mutation webhookSubscriptionDelete($id: ID!) {
      webhookSubscriptionDelete(id: $id) {
        deletedWebhookSubscriptionId
        userErrors {
          field
          message
        }
      }
    }
  `;
  try {
    const response = await client.query({
      data: {
        query: mutation,
        variables: { id },
      },
    });
    console.log(`Удалён вебхук ${id}:`, response.body.data.webhookSubscriptionDelete);
  } catch (error) {
    console.error(`Ошибка удаления вебхука ${id}:`, error.message);
  }
}

async function createWebhook(topic) {
  const mutation = `
    mutation webhookSubscriptionCreate($topic: WebhookSubscriptionTopic!, $webhookSubscription: WebhookSubscriptionInput!) {
      webhookSubscriptionCreate(topic: $topic, webhookSubscription: $webhookSubscription) {
        webhookSubscription {
          id
          topic
        }
        userErrors {
          field
          message
        }
      }
    }
  `;
  const variables = {
    topic,
    webhookSubscription: {
      callbackUrl: WEBHOOK_URL,
      format: 'JSON',
    },
  };
  try {
    const response = await client.query({
      data: {
        query: mutation,
        variables,
      },
    });
    console.log(`Создан вебхук ${topic}:`, response.body.data.webhookSubscriptionCreate);
  } catch (error) {
    console.error(`Ошибка создания вебхука ${topic}:`, error.message);
  }
}

async function main() {
  try {
    // Удаляем существующие вебхуки
    const existingWebhooks = await getExistingWebhooks();
    console.log('Существующие вебхуки:', existingWebhooks);
    for (const { node } of existingWebhooks) {
      await deleteWebhook(node.id);
    }

    // Создаём новые вебхуки
    for (const topic of WEBHOOK_TOPICS) {
      await createWebhook(topic);
    }
    console.log('Все вебхуки успешно созданы через GraphQL');
  } catch (error) {
    console.error('Ошибка:', error.message);
  }
}

main();