<?php

// Логирование
function logMessage($message) {
    $timestamp = date('c');
    $logMessage = "$timestamp - " . json_encode($message) . "\n";
    file_put_contents(__DIR__ . '/../logs/cron.log', $logMessage, FILE_APPEND);
}

// Чтение последней даты обработки
$lastProcessedFile = __DIR__ . '/last_processed.txt';
$lastProcessedAt = file_exists($lastProcessedFile) ? file_get_contents($lastProcessedFile) : '2025-04-01T00:00:00Z';

// URL фида Shopify (используем твой ngrok URL)
$feedUrl = "https://0d8a-173-244-158-23.ngrok-free.app/feed/orders.json?since=" . urlencode($lastProcessedAt);

// Запрос фида
$ch = curl_init($feedUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
]);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode !== 200 || !$response) {
    logMessage(['type' => 'cron', 'status' => 'error', 'details' => 'Failed to fetch feed', 'httpCode' => $httpCode]);
    exit(1);
}

$feed = json_decode($response, true);
if (!isset($feed['orders'])) {
    logMessage(['type' => 'cron', 'status' => 'error', 'details' => 'Invalid feed format']);
    exit(1);
}

// Фильтрация цен по странам (пример маппинга)
$priceMapping = [
    'SKU123_FR' => 89.99,
    'SKU123_US' => 99.99,
];

// Обработка заказов (пока без Vtiger, просто логируем)
foreach ($feed['orders'] as $order) {
    $orderId = $order['order_id'];

    // Фильтрация цен по странам
    $filteredItems = [];
    foreach ($order['items'] as $item) {
        $key = $item['sku'] . '_' . $item['country'];
        $item['price'] = $priceMapping[$key] ?? $item['price'];
        $filteredItems[] = $item;
    }

    logMessage([
        'type' => 'cron',
        'status' => 'success',
        'order_id' => $orderId,
        'details' => 'Order processed',
        'filtered_items' => $filteredItems,
    ]);
}

// Обновление последней даты обработки
$lastOrderDate = end($feed['orders'])['created_at'] ?? $lastProcessedAt;
file_put_contents($lastProcessedFile, $lastOrderDate);

logMessage(['type' => 'cron', 'status' => 'success', 'details' => 'Processed ' . count($feed['orders']) . ' orders']);