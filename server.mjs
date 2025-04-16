import express from 'express';
import crypto from 'crypto';
import fs from 'fs/promises';
import dotenv from 'dotenv';
import fetch from 'node-fetch'; // Для HTTP-запросов к vTiger

// Загружаем переменные окружения
dotenv.config();

// Проверяем обязательные переменные
const requiredEnvVars = [
  'SHOPIFY_API_SECRET',
  'SHOPIFY_STORE_DOMAIN',
  'SHOPIFY_ADMIN_ACCESS_TOKEN',
  'VTIGER_URL',
  'VTIGER_USERNAME',
  'VTIGER_ACCESS_KEY',
];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Ошибка: Переменная ${envVar} не задана в .env`);
    process.exit(1);
  }
}

console.log('Загруженные переменные:', {
  SHOPIFY_API_SECRET: process.env.SHOPIFY_API_SECRET,
  SHOPIFY_STORE_DOMAIN: process.env.SHOPIFY_STORE_DOMAIN,
  VTIGER_URL: process.env.VTIGER_URL,
  VTIGER_USERNAME: process.env.VTIGER_USERNAME,
});

const app = express();

// Логирование
const log = async (data) => {
  const logEntry = `${new Date().toISOString()} - ${JSON.stringify(data)}\n`;
  try {
    await fs.appendFile('logs/webhook.log', logEntry);
  } catch (error) {
    console.error('Ошибка записи лога:', error.message);
  }
};

// Безопасное сравнение HMAC
function safeCompare(received, expected) {
  const buffA = Buffer.from(received, 'base64');
  const buffB = Buffer.from(expected, 'base64');

  if (buffA.length !== buffB.length) {
    return false;
  }

  return crypto.timingSafeEqual(buffA, buffB);
}

// Валидация HMAC
const verifyWebhook = async (req) => {
  const hmacHeader = req.get('X-Shopify-Hmac-Sha256');
  const body = req.body; // Buffer
  const secret = process.env.SHOPIFY_API_SECRET;
  const webhookId = req.get('X-Shopify-Webhook-Id');

  try {
    await fs.writeFile(`logs/webhook_body_${Date.now()}.json`, body);
    console.log('Тело вебхука сохранено в logs/webhook_body_*.json');
  } catch (error) {
    console.error('Ошибка сохранения тела:', error.message);
  }

  console.log('Сырое тело (строка):', body.toString('utf8'));
  console.log('Сырое тело (байты):', body);

  console.log('Проверка HMAC:', {
    hmacHeader,
    bodyLength: body.length,
    secret,
    webhookId,
  });

  if (!hmacHeader || !body || !secret) {
    console.error('Отсутствует HMAC, тело или секрет:', { hmacHeader, body, secret });
    return false;
  }

  const hash = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('base64');

  const isValid = safeCompare(hmacHeader, hash);
  if (!isValid) {
    console.error('Ошибка HMAC:', { expected: hash, received: hmacHeader });
  }
  return isValid;
};

// Аутентификация в vTiger
const authenticateVtiger = async () => {
  try {
    // 1. Получаем challenge token
    const challengeResponse = await fetch(
      `${process.env.VTIGER_URL}/webservice.php?operation=getchallenge&username=${process.env.VTIGER_USERNAME}`
    );
    const challengeData = await challengeResponse.json();
    if (!challengeData.success) {
      throw new Error('Ошибка получения challenge token: ' + JSON.stringify(challengeData));
    }
    const token = challengeData.result.token;

    // 2. Генерируем ключ для входа
    const loginKey = crypto
      .createHash('md5')
      .update(token + process.env.VTIGER_ACCESS_KEY)
      .digest('hex');

    // 3. Выполняем вход
    const loginResponse = await fetch(`${process.env.VTIGER_URL}/webservice.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `operation=login&username=${process.env.VTIGER_USERNAME}&accessKey=${loginKey}`,
    });
    const loginData = await loginResponse.json();
    if (!loginData.success) {
      throw new Error('Ошибка входа в vTiger: ' + JSON.stringify(loginData));
    }

    return loginData.result.sessionName;
  } catch (error) {
    console.error('Ошибка аутентификации в vTiger:', error.message);
    throw error;
  }
};

// Создание контакта в vTiger
const createVtigerContact = async (sessionName, customer, address) => {
  const contactData = {
    elementType: 'Contacts',
    element: JSON.stringify({
      firstname: customer.first_name,
      lastname: customer.last_name,
      email: customer.email,
      phone: address.phone || '',
      mailingstreet: `${address.address1 || ''} ${address.address2 || ''}`.trim(),
      mailingcity: address.city || '',
      mailingzip: address.zip || '',
      mailingcountry: address.country || '',
      assigned_user_id: '19x1', // ID пользователя в vTiger (например, admin), нужно заменить
    }),
  };

  const response = await fetch(`${process.env.VTIGER_URL}/webservice.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `operation=create&sessionName=${sessionName}&${new URLSearchParams(contactData).toString()}`,
  });
  const result = await response.json();
  if (!result.success) {
    throw new Error('Ошибка создания контакта в vTiger: ' + JSON.stringify(result));
  }
  return result.result.id; // Например, "12x123"
};

// Создание заказа в vTiger
const createVtigerSalesOrder = async (sessionName, order, contactId) => {
  const salesOrderData = {
    elementType: 'SalesOrder',
    element: JSON.stringify({
      subject: `Order #${order.order_number}`,
      bill_street: order.billing_address.address1 || '',
      ship_street: order.shipping_address.address1 || '',
      bill_city: order.billing_address.city || '',
      ship_city: order.shipping_address.city || '',
      bill_code: order.billing_address.zip || '',
      ship_code: order.shipping_address.zip || '',
      bill_country: order.billing_address.country || '',
      ship_country: order.shipping_address.country || '',
      sostatus: order.financial_status === 'paid' ? 'Approved' : 'Created',
      currency_id: '21x1', // ID валюты (EUR), нужно заменить
      conversion_rate: 1,
      grand_total: order.total_price,
      assigned_user_id: '19x1', // ID пользователя в vTiger (например, admin), нужно заменить
      contact_id: contactId,
      // Товары (нужно добавить поддержку продуктов в vTiger)
      lineitems: order.line_items.map(item => ({
        productid: '14x1', // ID продукта в vTiger, нужно заменить
        quantity: item.quantity,
        listprice: item.price,
      })),
    }),
  };

  const response = await fetch(`${process.env.VTIGER_URL}/webservice.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `operation=create&sessionName=${sessionName}&${new URLSearchParams(salesOrderData).toString()}`,
  });
  const result = await response.json();
  if (!result.success) {
    throw new Error('Ошибка создания заказа в vTiger: ' + JSON.stringify(result));
  }
  return result.result.id;
};

// Эндпоинт вебхуков
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const topic = req.get('X-Shopify-Topic');
    const shop = req.get('X-Shopify-Shop-Domain');
    const hmac = req.get('X-Shopify-Hmac-Sha256');
    const webhookId = req.get('X-Shopify-Webhook-Id');
    const body = req.body;

    console.log('Заголовки запроса:', req.headers);
    console.log('Получен вебхук:', {
      topic,
      shop,
      hmac,
      bodyLength: body.length,
      webhookId,
    });

    if (!await verifyWebhook(req)) {
      await log({ type: 'webhook', status: 'error', details: 'Неверная HMAC подпись', webhookId });
      return res.status(401).json({ error: 'Неверная HMAC подпись' });
    }

    let data;
    try {
      data = JSON.parse(body.toString('utf8'));
    } catch (error) {
      await log({ type: 'webhook', status: 'error', details: `Ошибка парсинга: ${error.message}`, webhookId });
      return res.status(400).json({ error: 'Неверное тело' });
    }

    await log({
      type: 'webhook',
      topic,
      shop,
      order_id: data.id || 'N/A',
      status: 'success',
      details: 'Вебхук получен',
      webhookId,
    });

    console.log('Вебхук обработан:', { topic, shop, order_id: data.id });

    // Интеграция с vTiger (только для orders/create)
    if (topic === 'orders/create') {
      try {
        // 1. Аутентификация в vTiger
        const sessionName = await authenticateVtiger();

        // 2. Создаём контакт
        const contactId = await createVtigerContact(sessionName, data.customer, data.billing_address);

        // 3. Создаём заказ
        const salesOrderId = await createVtigerSalesOrder(sessionName, data, contactId);

        await log({
          type: 'vtiger',
          status: 'success',
          details: `Контакт ${contactId} и заказ ${salesOrderId} созданы`,
          order_id: data.id,
        });
      } catch (error) {
        await log({
          type: 'vtiger',
          status: 'error',
          details: error.message,
          order_id: data.id,
        });
        console.error('Ошибка интеграции с vTiger:', error.message);
      }
    }

    res.status(200).send('Вебхук обработан');
  } catch (error) {
    await log({ type: 'webhook', status: 'error', details: error.message });
    console.error('Ошибка вебхука:', error.message);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});