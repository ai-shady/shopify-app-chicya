import React, { useEffect, useState } from 'react';
import {
  Page,
  Layout,
  Card,
  Banner,
  Badge,
  Link,
  Button,
  IndexTable,
  Text,
  InlineStack,
  BlockStack,
  SkeletonBodyText,
  SkeletonPage,
  useIndexResourceState
} from '@shopify/polaris';
import { useAppBridge } from '@shopify/app-bridge-react';

const MIME = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  webp: 'image/webp',
  ico: 'image/x-icon',
  css: 'text/css',
  js: 'text/javascript',
  json: 'application/json',
  wasm: 'application/wasm',
  html: 'text/html'
};

function ContentType(path) {
  const ext = (path.split('.').pop() || '').toLowerCase();
  return MIME[ext] || 'application/octet-stream';
}

function App() {
  const params = new URLSearchParams(window.location.search);
  const shop = params.get('shop') || '';
  const host = params.get('host') || '';
  const embedded = host !== '' || params.get('embedded') === '1';
  const shopify = useAppBridge();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const apiKey = __CHICYA_API_KEY__;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await fetch('/events?view=json');
        const j = await r.json();
        if (!cancelled) {
          setEvents(j.events || []);
          setError('');
        }
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const t = setInterval(load, 8000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  const rows = events.map((e, i) => ({
    id: `${e.id || i}`,
    time: new Date(e.time).toLocaleString('zh-CN'),
    type: e.type,
    source: e.source,
    payload: JSON.stringify(e.payload)
  }));

  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(rows);

  if (loading) {
    return (
      <SkeletonPage title="CHICYA App Console">
        <Layout>
          <Layout.Section>
            <Card><SkeletonBodyText /></Card>
          </Layout.Section>
        </Layout>
      </SkeletonPage>
    );
  }

  return (
    <Page
      title="CHICYA App Console"
      subtitle={shop ? `商店: ${shop}` : '未传递 shop 参数'}
      titleMetadata={
        <InlineStack gap="200">
          <Badge tone={embedded ? 'success' : 'attention'}>
            {embedded ? 'Embedded in Shopify Admin' : 'Preview mode'}
          </Badge>
          {apiKey ? <Badge>App Bridge connected</Badge> : null}
        </InlineStack>
      }
      primaryAction={
        <Button
          variant="primary"
          onClick={() => {
            shopify.toast.show('CHICYA embedded app connected');
          }}
        >
          Show toast
        </Button>
      }
    >
      {error ? (
        <Banner tone="critical" title="Webhook events load failed">
          {error}
        </Banner>
      ) : (
        <Banner tone="info" title="Webhook 实时事件">
          Endpoint <code>/events/webhook</code> · 最近 {events.length} 条 ·
          事件持久化于 Upstash Redis，跨冷启动保留
        </Banner>
      )}

      <Layout>
        <Layout.Section>
          <Card padding="0">
            <IndexTable
              resourceName={{ singular: 'event', plural: 'events' }}
              itemCount={rows.length}
              selectedItemsCount={
                allResourcesSelected ? 'All' : selectedResources.length
              }
              onSelectionChange={handleSelectionChange}
              headings={[
                { title: '时间' },
                { title: 'Topic' },
                { title: '来源' },
                { title: 'Payload' }
              ]}
            >
              {rows.map(({ id, time, type, source, payload }, index) => (
                <IndexTable.Row
                  id={id}
                  key={id}
                  position={index}
                  selected={selectedResources.includes(id)}
                >
                  <IndexTable.Cell>
                    <Text as="span" variant="bodySm">
                      {time}
                    </Text>
                  </IndexTable.Cell>
                  <IndexTable.Cell>
                    <Text as="span" fontWeight="semibold">
                      {type}
                    </Text>
                  </IndexTable.Cell>
                  <IndexTable.Cell>{source}</IndexTable.Cell>
                  <IndexTable.Cell>
                    <Text as="span" variant="bodySm" tone="subdued">
                      {payload.slice(0, 220)}
                      {payload.length > 220 ? '…' : ''}
                    </Text>
                  </IndexTable.Cell>
                </IndexTable.Row>
              ))}
            </IndexTable>
          </Card>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <BlockStack gap="400">
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  App Proxy Lookbook
                </Text>
                <Text as="p" variant="bodyMd" tone="subdued">
                  店铺路径 <code>/apps/lookbook</code> 通过 Shopify App Proxy
                  代理到本服务，用 Admin API 拉取真实商品数据渲染进主题。
                </Text>
                <InlineStack gap="200">
                  <Button
                    variant="primary"
                    onClick={() =>
                      window.open('https://chicya.com/apps/lookbook', '_blank')
                    }
                  >
                    Lookbook 页
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      window.open(
                        'https://chicya.com/apps/lookbook?view=json',
                        '_blank'
                      )
                    }
                  >
                    JSON 视图
                  </Button>
                </InlineStack>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  Webhook 面板
                </Text>
                <Text as="p" variant="bodyMd" tone="subdued">
                  独立打开事件面板或直接查看 JSON 数据。
                </Text>
                <InlineStack gap="200">
                  <Button
                    variant="secondary"
                    onClick={() =>
                      window.open(
                        `${window.location.origin}/events`,
                        '_blank'
                      )
                    }
                  >
                    独立事件面板
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      window.open(
                        `${window.location.origin}/events?view=json`,
                        '_blank'
                      )
                    }
                  >
                    JSON 数据
                  </Button>
                </InlineStack>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  App Bridge
                </Text>
                <Text as="p" variant="bodyMd" tone="subdued">
                  Polaris + App Bridge React (useNavigate / useToast) ·
                  apiKey: {apiKey.slice(0, 8)}…
                </Text>
                <Button
                  variant="plain"
                  onClick={() =>
                    shopify.navigate(
                      `/?shop=${encodeURIComponent(
                        shop
                      )}&host=${encodeURIComponent(host)}`
                    )
                  }
                >
                  重新加载当前页
                </Button>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

export default App;