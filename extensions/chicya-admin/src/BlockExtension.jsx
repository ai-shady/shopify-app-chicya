import "@shopify/ui-extensions/preact";
import {render} from 'preact';

export default async () => {
  render(<Extension />, document.body);
}

function Extension() {
  const {i18n} = shopify;
  const selected = shopify.data?.selected ?? {};
  const title = selected?.title ?? '—';

  return (
    <s-admin-block heading={i18n.translate('heading')}>
      <s-stack direction="block" inlineAlignment="space-between">
        <s-box padding="base">
          <s-text type="strong">{i18n.translate('slogan')}</s-text>
        </s-box>
        <s-box padding="base">
          <s-text tone="subdued">{i18n.translate('product', {title})}</s-text>
          <s-text>{i18n.translate('subtext')}</s-text>
        </s-box>
      </s-stack>
    </s-admin-block>
  );
}
