import { GraphQLClient } from 'graphql-request';

if (!process.env.SHOPIFY_STORE_DOMAIN) {
  throw new Error('Переменная окружения SHOPIFY_STORE_DOMAIN не определена');
}
if (!process.env.SHOPIFY_ADMIN_ACCESS_TOKEN) {
  throw new Error('Переменная окружения SHOPIFY_ADMIN_ACCESS_TOKEN не определена');
}

const shopifyClient = new GraphQLClient(`https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/2025-04/graphql.json`, {
  headers: {
    'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_ACCESS_TOKEN,
  },
});

const ORDERS_QUERY = `
  query Orders($first: Int!, $after: String) {
    orders(first: $first, after: $after) {
      edges {
        node {
          id
          name
          createdAt
          totalPrice
          customer {
            firstName
            lastName
            email
          }
          billingAddress {
            firstName
            lastName
            phone
            address1
            zip
            city
            country
          }
          shippingAddress {
            firstName
            lastName
            phone
            address1
            zip
            city
            country
          }
          transactions(first: 10) {
            amount
            createdAt
          }
          lineItems(first: 10) {
            edges {
              node {
                variant {
                  sku
                }
              }
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '10', 10);
  const after = url.searchParams.get('after') || null;

  try {
    console.log('Выполняю запрос к Shopify API для заказов...');
    console.log('URL:', `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/2025-04/graphql.json`);
    console.log('Токен:', process.env.SHOPIFY_ADMIN_ACCESS_TOKEN ? 'Токен присутствует' : 'Токен отсутствует');
    const data = await shopifyClient.request(ORDERS_QUERY, { first: limit, after });
    console.log('Данные получены:', data);

    const jsonFeed = data.orders.edges.map(edge => {
      const order = edge.node;
      const billingAddress = order.billingAddress || {};
      const shippingAddress = order.shippingAddress || {};

      return {
        reference: order.name,
        id: order.id.replace('gid://shopify/Order/', 'SF'),
        payment: order.transactions.map(tx => ({
          totalAmount: parseFloat(tx.amount),
          createdAt: tx.createdAt,
        })),
        billingAddress: {
          lastName: billingAddress.lastName || order.customer?.lastName || '',
          firstName: billingAddress.firstName || order.customer?.firstName || '',
          phone: billingAddress.phone || '',
          mobilePhone: billingAddress.phone || '',
          street: billingAddress.address1 || '',
          postalCode: billingAddress.zip || '',
          city: billingAddress.city || '',
          country: billingAddress.country || '',
          email: order.customer?.email || '',
        },
        shippingAddress: {
          lastName: shippingAddress.lastName || order.customer?.lastName || '',
          firstName: shippingAddress.firstName || order.customer?.firstName || '',
          phone: shippingAddress.phone || '',
          mobilePhone: shippingAddress.phone || '',
          street: shippingAddress.address1 || '',
          postalCode: shippingAddress.zip || '',
          city: shippingAddress.city || '',
          country: shippingAddress.country || '',
        },
        items: order.lineItems.edges.map(item => ({
          reference: item.node.variant?.sku || 'UNKNOWN',
        })),
      };
    });

    return new Response(JSON.stringify({
      orders: jsonFeed,
      pageInfo: data.orders.pageInfo,
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Ошибка GraphQL:', error.message);
    console.error('Детали ошибки:', error.response?.errors || error.response || error);
    return new Response(JSON.stringify({ error: 'Не удалось получить заказы' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};