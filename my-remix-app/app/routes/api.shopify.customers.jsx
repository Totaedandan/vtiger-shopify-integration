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

const CUSTOMERS_QUERY = `
  query Customers($first: Int!, $after: String) {
    customers(first: $first, after: $after) {
      edges {
        node {
          id
          firstName
          lastName
          email
          phone
          defaultAddress {
            firstName
            lastName
            phone
            address1
            zip
            city
            country
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
    console.log('Выполняю запрос к Shopify API для клиентов...');
    console.log('URL:', `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/2025-04/graphql.json`);
    console.log('Токен:', process.env.SHOPIFY_ADMIN_ACCESS_TOKEN ? 'Токен присутствует' : 'Токен отсутствует');
    const data = await shopifyClient.request(CUSTOMERS_QUERY, { first: limit, after });
    console.log('Данные получены:', data);

    const jsonFeed = data.customers.edges.map(edge => {
      const customer = edge.node;
      const defaultAddress = customer.defaultAddress || {};

      return {
        reference: customer.id.replace('gid://shopify/Customer/', 'CUST'),
        id: customer.id.replace('gid://shopify/Customer/', 'SF'),
        billingAddress: {
          lastName: defaultAddress.lastName || customer.lastName || '',
          firstName: defaultAddress.firstName || customer.firstName || '',
          phone: defaultAddress.phone || customer.phone || '',
          mobilePhone: defaultAddress.phone || customer.phone || '',
          street: defaultAddress.address1 || '',
          postalCode: defaultAddress.zip || '',
          city: defaultAddress.city || '',
          country: defaultAddress.country || '',
          email: customer.email || '',
        },
      };
    });

    return new Response(JSON.stringify({
      customers: jsonFeed,
      pageInfo: data.customers.pageInfo,
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Ошибка GraphQL:', error.message);
    console.error('Детали ошибки:', error.response?.errors || error.response || error);
    return new Response(JSON.stringify({ error: 'Не удалось получить клиентов' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};