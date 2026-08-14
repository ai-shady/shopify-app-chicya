import { redis, redisAvailable } from './redis.js';

const ADMIN_API_VERSION = '2026-07';
const GIFT_HANDLE = 'chicya-free-gift';

function giftKey(shop) {
  return `shopify:gift_variant:${shop}`;
}

async function adminRequest(shop, token, query, variables) {
  const res = await fetch(`https://${shop}/admin/api/${ADMIN_API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': token
    },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(10000)
  });
  if (!res.ok) return null;
  return res.json();
}

async function findGiftVariant(shop, token) {
  const query = `
    query FindGiftProduct($q: String!) {
      products(first: 1, query: $q) {
        nodes {
          id
          variants(first: 1) {
            nodes { id }
          }
        }
      }
    }
  `;
  const json = await adminRequest(shop, token, query, { q: `handle:${GIFT_HANDLE}` });
  const product = json?.data?.products?.nodes?.[0];
  return product?.variants?.nodes?.[0]?.id || null;
}

async function createGiftProduct(shop, token) {
  const mutation = `
    mutation CreateGiftProduct($input: ProductCreateInput!) {
      productCreate(product: $input) {
        product {
          id
        }
        userErrors { field message }
      }
    }
  `;
  const json = await adminRequest(shop, token, mutation, {
    input: {
      title: 'CHICYA Free Gift',
      handle: GIFT_HANDLE,
      productType: 'gift',
      status: 'ACTIVE'
    }
  });
  const errors = json?.data?.productCreate?.userErrors || [];
  if (errors.length) return { error: errors[0].message };
  const productId = json?.data?.productCreate?.product?.id;
  if (!productId) return { error: 'no product id after create' };

  const existing = await adminRequest(
    shop,
    token,
    `query GetVariants($id: ID!) { product(id: $id) { variants(first: 5) { nodes { id price } } } }`,
    { id: productId }
  );
  const existingVariants = existing?.data?.product?.variants?.nodes || [];
  if (existingVariants.length) {
    return { variantId: existingVariants[0].id };
  }

  const variantMutation = `
    mutation CreateGiftVariant($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkCreate(productId: $productId, variants: $variants) {
        productVariants { id }
        userErrors { field message }
      }
    }
  `;
  const vjson = await adminRequest(shop, token, variantMutation, {
    productId,
    variants: [
      {
        price: '0.00',
        optionValues: [{ optionName: 'Title', name: 'Default Title' }]
      }
    ]
  });
  const verrors = vjson?.data?.productVariantsBulkCreate?.userErrors || [];
  if (verrors.length) return { error: `variant create failed: ${verrors[0].message}` };
  const variantId = vjson?.data?.productVariantsBulkCreate?.productVariants?.[0]?.id;
  return { variantId: variantId || null };
}

async function setShopMetafield(shop, token, shopId, value) {
  const mutation = `
    mutation SetShopMetafield($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields { key namespace value }
        userErrors { field message }
      }
    }
  `;
  const json = await adminRequest(shop, token, mutation, {
    metafields: [
      {
        namespace: '$app',
        key: 'giftVariantId',
        type: 'single_line_text_field',
        ownerId: shopId,
        value
      }
    ]
  });
  const errors = json?.data?.metafieldsSet?.userErrors || [];
  return { ok: errors.length === 0, error: errors[0]?.message || null };
}

async function getShopId(shop, token) {
  const json = await adminRequest(shop, token, 'query { shop { id } }', {});
  return json?.data?.shop?.id || null;
}

export async function ensureGiftVariant(shop, token) {
  if (!shop || !token) return { ok: false, error: 'missing shop or token' };

  let variantId = await findGiftVariant(shop, token);
  if (!variantId) {
    const created = await createGiftProduct(shop, token);
    if (created.error) return { ok: false, error: `create failed: ${created.error}` };
    variantId = created.variantId;
  }
  if (!variantId) return { ok: false, error: 'no gift variant found or created' };

  if (redisAvailable()) {
    await redis('SET', giftKey(shop), variantId);
  }

  const shopId = await getShopId(shop, token);
  let metafield = { ok: false, error: 'no shop id' };
  if (shopId) metafield = await setShopMetafield(shop, token, shopId, variantId);

  return { ok: true, variantId, metafield };
}
