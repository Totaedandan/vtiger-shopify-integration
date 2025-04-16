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

const PRODUCTS_QUERY = `
  query Products($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      edges {
        node {
          id
          title
          variants(first: 10) {
            edges {
              node {
                sku
                price
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
    console.log('Выполняю запрос к Shopify API для товаров...');
    console.log('URL:', `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/2025-04/graphql.json`);
    console.log('Токен:', process.env.SHOPIFY_ADMIN_ACCESS_TOKEN ? 'Токен присутствует' : 'Токен отсутствует');
    const data = await shopifyClient.request(PRODUCTS_QUERY, { first: limit, after });
    console.log('Данные получены:', data);

    const jsonFeed = data.products.edges.map(edge => {
      const product = edge.node;

      return {
        reference: product.id.replace('gid://shopify/Product/', 'PROD'),
        id: product.id.replace('gid://shopify/Product/', 'SF'),
        title: product.title,
        items: product.variants.edges.map(variant => ({
          reference: variant.node.sku || 'UNKNOWN',
          price: parseFloat(variant.node.price),
        })),
      };
    });

    return new Response(JSON.stringify({
      products: jsonFeed,
      pageInfo: data.products.pageInfo,
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Ошибка GraphQL:', error.message);
    console.error('Детали ошибки:', error.response?.errors || error.response || error);
    return new Response(JSON.stringify({ error: 'Не удалось получить товары' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};