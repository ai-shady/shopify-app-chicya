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

  return (
    <s-banner heading={shopify.i18n.translate("title")}>
      <s-stack gap="base">
        <s-text>{shopify.i18n.translate("slogan")}</s-text>
        <s-checkbox
          checked={freeGiftRequested?.metafield?.value === "true"}
          onChange={onCheckboxChange}
          label={shopify.i18n.translate("freeGiftLabel")}
        />
      </s-stack>
    </s-banner>
  );

  async function onCheckboxChange(event) {
    const isChecked = event.target.checked;
    const result = await shopify.applyMetafieldChange({
      type: "updateCartMetafield",
      metafield: {
        namespace: "$app",
        key: "requestedFreeGift",
        value: isChecked ? "true" : "false",
        type: "boolean",
      },
    });
    console.log("applyMetafieldChange result", result);
  }
}
