import '@shopify/ui-extensions/preact';
import {render} from "preact";

export default async () => {
  render(<Extension />, document.body);
};

function Extension() {
  if (!shopify.instructions.value.metafields.canSetCartMetafields) {
    return (
      <s-banner heading={shopify.i18n.translate("title")} tone="warning">
        {shopify.i18n.translate("metafieldChangesAreNotSupported")}
      </s-banner>
    );
  }

  const freeGiftRequested = shopify.appMetafields.value.find(
    (appMetafield) =>
      appMetafield.target.type === "cart" &&
      appMetafield.metafield.namespace === "$app" &&
      appMetafield.metafield.key === "requestedFreeGift",
  );

  const shopGiftVariant = shopify.appMetafields.value.find(
    (appMetafield) =>
      appMetafield.target.type === "shop" &&
      appMetafield.metafield.namespace === "$app" &&
      appMetafield.metafield.key === "giftVariantId",
  );
  const giftVariantId = shopGiftVariant?.metafield?.value || "";

  return (
    <s-banner heading={shopify.i18n.translate("title")}>
      <s-stack gap="base">
        <s-text>{shopify.i18n.translate("slogan")}</s-text>
        <s-checkbox
          checked={freeGiftRequested?.metafield?.value === "true"}
          onChange={onCheckboxChange}
          label={shopify.i18n.translate("freeGiftLabel")}
        />
        {!giftVariantId && (
          <s-text tone="subdued">
            {shopify.i18n.translate("giftVariantMissing")}
          </s-text>
        )}
      </s-stack>
    </s-banner>
  );

  async function onCheckboxChange(event) {
    const isChecked = event.target.checked;
    const changes = [
      {
        type: "updateCartMetafield",
        metafield: {
          namespace: "$app",
          key: "requestedFreeGift",
          value: isChecked ? "true" : "false",
          type: "boolean",
        },
      },
      {
        type: "updateCartMetafield",
        metafield: {
          namespace: "$app",
          key: "giftVariantId",
          value: isChecked ? giftVariantId : "",
          type: "single_line_text_field",
        },
      },
    ];
    for (const change of changes) {
      const result = await shopify.applyMetafieldChange(change);
      console.log("applyMetafieldChange result", result);
    }
  }
}
