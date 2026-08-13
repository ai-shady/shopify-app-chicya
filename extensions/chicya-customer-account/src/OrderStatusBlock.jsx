import '@shopify/ui-extensions/preact';
import {render} from "preact";

export default async () => {
  render(<Extension />, document.body);
};

function Extension() {
  return (
    <s-banner>
      <s-stack gap="base">
        <s-text type="heading">CHICYA Colour Club</s-text>
        <s-text>{shopify.i18n.translate("loyaltyMessage")}</s-text>
      </s-stack>
    </s-banner>
  );
}
