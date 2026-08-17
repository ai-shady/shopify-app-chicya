import React from 'react';
import {
  Page,
  Layout,
  Card,
  Banner,
  Badge,
  Button,
  Text,
  InlineStack,
  BlockStack,
  Grid,
  Box,
  Link
} from '@shopify/polaris';

const CAPABILITIES = [
  {
    title: 'Checkout Free Gift',
    desc: 'Cart transform + validation functions (Rust/Wasm) add a $0 gift and block checkout if it is missing.',
    tag: 'Functions'
  },
  {
    title: 'Live Lookbook',
    desc: 'App Proxy page rendering your real product data via the Admin API.',
    tag: 'App Proxy'
  },
  {
    title: 'Event Stream',
    desc: 'Webhook + web pixel events persisted to Upstash Redis, surviving cold starts.',
    tag: 'Persistence'
  },
  {
    title: 'Branding Surfaces',
    desc: 'Admin, checkout, customer account, POS, delivery, discounts, Flow, theme and pixel extensions.',
    tag: '11 Extensions'
  }
];

function Landing() {
  return (
    <Page narrowWidth>
      <BlockStack gap="600">
        <Banner tone="info" title="SHOPIFY EMBEDDED APP">
          This page is the public showcase. The app itself runs embedded inside the
          Shopify admin. Open it from your store dashboard to see the live console.
        </Banner>

        <Box paddingBlockStart="200">
          <Text as="h1" variant="heading2xl" fontWeight="bold">
            CHICYA
          </Text>
          <Text as="p" variant="bodyLg" tone="subdued">
            A full-stack Shopify app demo — 11 extensions across every major
            developer surface, with a serverless backend and real persistence.
          </Text>
        </Box>

        <Grid>
          {CAPABILITIES.map((c) => (
            <Grid.Cell key={c.title} columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6 }}>
              <Card padding="400">
                <BlockStack gap="200">
                  <Badge tone="info">{c.tag}</Badge>
                  <Text as="h2" variant="headingMd">
                    {c.title}
                  </Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    {c.desc}
                  </Text>
                </BlockStack>
              </Card>
            </Grid.Cell>
          ))}
        </Grid>

        <Card padding="400">
          <BlockStack gap="300">
            <Text as="h2" variant="headingMd">
              Try it
            </Text>
            <InlineStack gap="300">
              <Button
                variant="primary"
                onClick={() =>
                  window.open('/events?view=json', '_blank')
                }
              >
                Webhook events (JSON)
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  window.open('/proxy/lookbook?shop=d4wpzt-qv.myshopify.com', '_blank')
                }
              >
                Lookbook
              </Button>
            </InlineStack>
          </BlockStack>
        </Card>

        <Text as="p" variant="bodySm" tone="subdued">
          Built with Polaris + App Bridge React · Vercel + Upstash Redis · MIT
          © ai-shady
        </Text>
      </BlockStack>
    </Page>
  );
}

export default Landing;
