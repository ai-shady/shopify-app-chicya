import React, { useEffect, useState } from 'react';
import {
  Page,
  Card,
  Banner,
  Badge,
  Button,
  Text,
  InlineStack,
  BlockStack,
  Grid,
  Box,
  Divider,
  SkeletonBodyText
} from '@shopify/polaris';
import {
  CartIcon,
  WandIcon,
  ChartLineIcon,
  AppExtensionIcon,
  CodeIcon,
  DatabaseIcon,
  RefreshIcon,
  StoreOnlineIcon,
  DeliveryIcon,
  DiscountIcon,
  PersonIcon,
  ChartVerticalFilledIcon,
  AutomationIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  StoreIcon,
  ThemeIcon,
  GiftCardIcon
} from '@shopify/polaris-icons';
import './landing.css';

const EXTENSIONS = [
  { name: 'Admin Block', target: 'admin.product-details.block', tag: 'UI', icon: StoreIcon },
  { name: 'Cart Transform', target: 'cart.transform.run', tag: 'Rust/Wasm', icon: CartIcon },
  { name: 'Checkout Block', target: 'purchase.checkout.block', tag: 'UI', icon: GiftCardIcon },
  { name: 'Checkout Validation', target: 'cart.validations.generate.run', tag: 'Rust/Wasm', icon: CheckCircleIcon },
  { name: 'Customer Account', target: 'customer-account.order-status.block', tag: 'UI', icon: PersonIcon },
  { name: 'Delivery Options', target: 'cart.delivery-options.transform', tag: 'Rust/Wasm', icon: DeliveryIcon },
  { name: 'Discounts', target: 'cart.lines.discounts.generate', tag: 'Rust/Wasm', icon: DiscountIcon },
  { name: 'Flow Template', target: 'flow_template', tag: 'Automation', icon: AutomationIcon },
  { name: 'POS', target: 'pos.home.tile + modal', tag: 'UI', icon: StoreOnlineIcon },
  { name: 'Theme Block', target: 'theme block (Liquid)', tag: 'Theme', icon: ThemeIcon },
  { name: 'Web Pixel', target: 'web_pixel', tag: 'Analytics', icon: ChartVerticalFilledIcon }
];

const FEATURES = [
  {
    icon: CartIcon,
    title: 'Self-closing free-gift loop',
    desc: 'Checkout writes cart metafields, a Rust function lineExpands the $0 gift, and a validation function blocks checkout if it goes missing.',
    tag: '3 extensions'
  },
  {
    icon: ChartLineIcon,
    title: 'Live product lookbook',
    desc: 'App Proxy renders real storefront products via the Admin API — with a static demo fallback.',
    tag: 'App Proxy'
  },
  {
    icon: DatabaseIcon,
    title: 'Persistent event stream',
    desc: 'Webhook + pixel events land in Neon Postgres (Redis fallback), surfaced in a live admin console.',
    tag: 'Postgres + Redis'
  },
  {
    icon: AppExtensionIcon,
    title: 'Every developer surface',
    desc: 'UI extensions, Rust/Wasm functions, Flow, theme block, web pixel, POS, delivery & discount functions.',
    tag: '11 extensions'
  }
];

const STACK = [
  'Vercel Serverless',
  'Neon Postgres',
  'Upstash Redis',
  'Rust → wasm32',
  'Polaris + React',
  'App Bridge v4',
  'GraphQL typegen',
  'Web Pixel API',
  'Shopify CLI'
];

function Landing() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let alive = true;
    fetch('/events?view=json')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d) setStats({ total: d.stats?.total ?? d.count ?? 0, storage: d.storage });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return (
    <Box className="landing">
      <Box className="landing-hero">
        <Box className="landing-hero-inner">
          <InlineStack gap="200" blockAlign="center">
            <Badge tone="info">SHOPIFY APP DEMO</Badge>
            <Badge tone="success">11 EXTENSIONS LIVE</Badge>
          </InlineStack>
          <Text as="h1" variant="heading4xl" fontWeight="bold" className="landing-title">
            CHICYA
          </Text>
          <Text as="p" variant="bodyLg" className="landing-subtitle">
            A full-stack Shopify app that flexes every major developer surface — from
            Rust/Wasm functions to an embedded Polaris console, backed by Neon Postgres
            and Upstash Redis on a free-tier stack.
          </Text>
          <InlineStack gap="300">
            <Button
              variant="primary"
              onClick={() => window.open('/proxy/lookbook?shop=d4wpzt-qv.myshopify.com', '_blank')}
            >
              <InlineStack gap="100" blockAlign="center">
                <WandIcon /> Explore Lookbook
              </InlineStack>
            </Button>
            <Button
              variant="secondary"
              onClick={() => window.open('/events?view=json', '_blank')}
            >
              Live Event Stream
            </Button>
          </InlineStack>
        </Box>
      </Box>

      <Box className="landing-body">
        <Page narrowWidth>
          <BlockStack gap="800">
            <Box className="landing-stats">
              <Grid>
                <Grid.Cell columnSpan={{ xs: 6, sm: 4, md: 4, lg: 4 }}>
                  <Card padding="400">
                    <BlockStack gap="100">
                      <Text as="p" variant="bodySm" tone="subdued">EVENTS PERSISTED</Text>
                      <Text as="h2" variant="heading3xl" fontWeight="bold">
                        {stats ? stats.total : <SkeletonBodyText lines={1} />}
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">Neon Postgres</Text>
                    </BlockStack>
                  </Card>
                </Grid.Cell>
                <Grid.Cell columnSpan={{ xs: 6, sm: 4, md: 4, lg: 4 }}>
                  <Card padding="400">
                    <BlockStack gap="100">
                      <Text as="p" variant="bodySm" tone="subdued">STORAGE ENGINE</Text>
                      <Text as="h2" variant="heading3xl" fontWeight="bold">
                        {stats ? stats.storage : <SkeletonBodyText lines={1} />}
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">Redis fallback</Text>
                    </BlockStack>
                  </Card>
                </Grid.Cell>
                <Grid.Cell columnSpan={{ xs: 6, sm: 4, md: 4, lg: 4 }}>
                  <Card padding="400">
                    <BlockStack gap="100">
                      <Text as="p" variant="bodySm" tone="subdued">EXTENSION TARGETS</Text>
                      <Text as="h2" variant="heading3xl" fontWeight="bold">11</Text>
                      <Text as="p" variant="bodySm" tone="subdued">single codebase</Text>
                    </BlockStack>
                  </Card>
                </Grid.Cell>
              </Grid>
            </Box>

            <BlockStack gap="400">
              <Text as="h2" variant="heading2xl" fontWeight="bold">What it does</Text>
              <Grid>
                {FEATURES.map((f) => (
                  <Grid.Cell key={f.title} columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6 }}>
                    <Card padding="500">
                      <BlockStack gap="300">
                        <InlineStack gap="200" blockAlign="center">
                          <Box className="feature-icon">
                            <f.icon />
                          </Box>
                          <Badge tone="info">{f.tag}</Badge>
                        </InlineStack>
                        <Text as="h3" variant="headingMd">{f.title}</Text>
                        <Text as="p" variant="bodyMd" tone="subdued">{f.desc}</Text>
                      </BlockStack>
                    </Card>
                  </Grid.Cell>
                ))}
              </Grid>
            </BlockStack>

            <BlockStack gap="400">
              <Text as="h2" variant="heading2xl" fontWeight="bold">The 11 extension surfaces</Text>
              <Grid>
                {EXTENSIONS.map((e) => (
                  <Grid.Cell key={e.name} columnSpan={{ xs: 6, sm: 6, md: 4, lg: 4 }}>
                    <Card padding="300">
                      <BlockStack gap="150">
                        <InlineStack gap="150" blockAlign="center">
                          <Box className="ext-icon"><e.icon /></Box>
                          <Text as="h3" variant="headingSm" fontWeight="semibold">{e.name}</Text>
                        </InlineStack>
                        <Text as="p" variant="bodySm" tone="subdued">{e.target}</Text>
                      </BlockStack>
                    </Card>
                  </Grid.Cell>
                ))}
              </Grid>
            </BlockStack>

            <Divider />

            <BlockStack gap="300">
              <Text as="h2" variant="heading2xl" fontWeight="bold">Free-gift loop, end to end</Text>
              <Card padding="500">
                <BlockStack gap="300">
                  {[
                    ['Checkout', 'Customer checks "add my free gift" — writes $app/requestedFreeGift + giftVariantId cart metafields'],
                    ['Cart transform', 'Rust function lineExpands the $0 gift variant into the cart'],
                    ['Validation', 'Another function blocks checkout if the requested gift ever disappears from the cart']
                  ].map(([step, desc], i) => (
                    <InlineStack key={step} gap="300" blockAlign="start">
                      <Box className="step-num">{i + 1}</Box>
                      <BlockStack gap="50">
                        <Text as="h3" variant="headingSm" fontWeight="semibold">{step}</Text>
                        <Text as="p" variant="bodyMd" tone="subdued">{desc}</Text>
                      </BlockStack>
                    </InlineStack>
                  ))}
                </BlockStack>
              </Card>
            </BlockStack>

            <BlockStack gap="300">
              <Text as="h2" variant="heading2xl" fontWeight="bold">Architecture</Text>
              <Card padding="500">
                <InlineStack gap="300" wrap blockAlign="center">
                  <Box className="arch-node"><StoreIcon /><Text as="p" variant="bodySm" fontWeight="semibold">Shopify store</Text></Box>
                  <ArrowRightIcon />
                  <Box className="arch-node"><CodeIcon /><Text as="p" variant="bodySm" fontWeight="semibold">Vercel serverless</Text></Box>
                  <ArrowRightIcon />
                  <Box className="arch-node"><DatabaseIcon /><Text as="p" variant="bodySm" fontWeight="semibold">Neon Postgres</Text></Box>
                  <Box className="arch-node"><RefreshIcon /><Text as="p" variant="bodySm" fontWeight="semibold">Upstash Redis</Text></Box>
                </InlineStack>
                <Divider />
                <InlineStack gap="200" wrap>
                  {STACK.map((s) => (
                    <Badge key={s} tone="info">{s}</Badge>
                  ))}
                </InlineStack>
              </Card>
            </BlockStack>

            <Card padding="500">
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd" fontWeight="semibold">Try it live</Text>
                <Text as="p" variant="bodyMd" tone="subdued">
                  The embedded console opens inside the Shopify admin. These endpoints are public
                  and powered by the live store:
                </Text>
                <InlineStack gap="300">
                  <Button variant="primary" onClick={() => window.open('/events?view=json', '_blank')}>
                    Events (JSON)
                  </Button>
                  <Button variant="secondary" onClick={() => window.open('/proxy/lookbook?shop=d4wpzt-qv.myshopify.com', '_blank')}>
                    Lookbook
                  </Button>
                </InlineStack>
              </BlockStack>
            </Card>

            <Text as="p" variant="bodySm" tone="subdued" className="landing-footer">
              Built with Polaris + App Bridge React · Vercel + Neon + Upstash · MIT © ai-shady
            </Text>
          </BlockStack>
        </Page>
      </Box>
    </Box>
  );
}

export default Landing;