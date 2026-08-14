use super::schema;
use shopify_function::prelude::*;
use shopify_function::Result;

const GIFT_VARIANT_ID: &str = "";

fn line_variant_id(
    line: &schema::cart_transform_run::cart_transform_run_input::cart::Lines,
) -> Option<&schema::Id> {
    use schema::cart_transform_run::cart_transform_run_input::cart::lines::Merchandise;
    match line.merchandise() {
        Merchandise::ProductVariant(variant) => Some(variant.id()),
        _ => None,
    }
}

#[shopify_function]
fn cart_transform_run(
    input: schema::cart_transform_run::CartTransformRunInput,
) -> Result<schema::CartTransformRunResult> {
    let no_changes = schema::CartTransformRunResult { operations: vec![] };

    let lines = input.cart().lines();
    if lines.is_empty() {
        return Ok(no_changes);
    }

    let max_cart_line = lines
        .iter()
        .max_by(|a, b| {
            a.cost()
                .subtotal_amount()
                .amount()
                .partial_cmp(b.cost().subtotal_amount().amount())
                .unwrap_or(std::cmp::Ordering::Equal)
        })
        .ok_or("No cart lines found")?;

    let gift_requested = input
        .cart()
        .requested_free_gift()
        .map(|metafield| metafield.value().trim() == "true")
        .unwrap_or(false);

    let gift_variant_id = input
        .cart()
        .gift_variant_id()
        .map(|metafield| metafield.value().trim())
        .filter(|value| !value.is_empty())
        .unwrap_or(GIFT_VARIANT_ID);

    let gift_configured = !gift_variant_id.is_empty();

    let gift_already_in_cart = lines
        .iter()
        .any(|line| line_variant_id(line) == Some(&gift_variant_id.to_string()));

    if gift_requested && gift_configured && !gift_already_in_cart {
        if let Some(original_variant_id) = line_variant_id(max_cart_line) {
            return Ok(schema::CartTransformRunResult {
                operations: vec![schema::Operation::LineExpand(schema::LineExpandOperation {
                    cart_line_id: max_cart_line.id().clone(),
                    expanded_cart_items: vec![
                        schema::ExpandedItem {
                            attributes: None,
                            merchandise_id: original_variant_id.clone(),
                            price: None,
                            quantity: *max_cart_line.quantity(),
                        },
                        schema::ExpandedItem {
                            attributes: None,
                            merchandise_id: gift_variant_id.to_string(),
                            price: Some(schema::ExpandedItemPriceAdjustment {
                                adjustment:
                                    schema::ExpandedItemPriceAdjustmentValue::FixedPricePerUnit(
                                        schema::ExpandedItemFixedPricePerUnitAdjustment {
                                            amount: Decimal(0.0),
                                        },
                                    ),
                            }),
                            quantity: 1,
                        },
                    ],
                    image: None,
                    price: None,
                    title: Some("CHICYA Vibe Pick ✦ Free Gift Included".to_string()),
                })],
            });
        }
    }

    Ok(schema::CartTransformRunResult {
        operations: vec![schema::Operation::LineUpdate(schema::LineUpdateOperation {
            cart_line_id: max_cart_line.id().clone(),
            image: None,
            price: None,
            title: Some("CHICYA Vibe Pick ✦ Colour Clash Starter".to_string()),
        })],
    })
}
