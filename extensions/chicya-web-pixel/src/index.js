import { register } from "@shopify/web-pixels-extension";

const ENDPOINT = "https://app.chicya.com/events/pixel";

const TRACKED_EVENTS = [
  "page_viewed",
  "product_viewed",
  "product_added_to_cart",
  "cart_viewed",
  "cart_updated",
  "checkout_started",
  "checkout_completed",
  "search_submitted",
];

function send(event, settings) {
  const payload = JSON.stringify({
    eventName: event.name,
    account: settings?.accountID || "demo",
    url: window.location.href,
    ts: new Date().toISOString(),
    data: summarize(event),
  });
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT, new Blob([payload], { type: "application/json" }));
    } else {
      fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      });
    }
  } catch (err) {
    console.error("[CHICYA Pixel] send failed", err);
  }
}

function summarize(event) {
  const out = {};
  for (const key of ["product", "cart", "url", "customer", "search", "checkout"]) {
    if (event[key] !== undefined) out[key] = event[key];
  }
  if (event.context && event.context.document) {
    out.pageUrl = event.context.document.location.href;
  }
  return out;
}

register(({ analytics, settings }) => {
  console.log("[CHICYA Pixel] registered. Account:", settings?.accountID || "demo");
  TRACKED_EVENTS.forEach((name) => {
    analytics.subscribe(name, (event) => {
      console.log("[CHICYA Pixel] event:", name, event);
      send(event, settings);
    });
  });
});
