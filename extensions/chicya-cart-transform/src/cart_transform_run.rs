use super::schema;
use shopify_function::prelude::*;
use shopify_function::Result;

#[shopify_function]
fn cart_transform_run(
    input: schema::cart_transform_run::CartTransformRunInput,
) -> Result<schema::CartTransformRunResult> {
    let no_changes = schema::CartTransformRunResult { operations: vec![] };

    let max_cart_line = input
        .cart()
        .lines()
        .iter()
        .max_by(|a, b| {
            a.cost()
                .subtotal_amount()
                .amount()
                .partial_cmp(b.cost().subtotal_amount().amount())
                .unwrap_or(std::cmp::Ordering::Equal)
        });

    let Some(max_cart_line) = max_cart_line else {
        return Ok(no_changes);
    };

    Ok(schema::CartTransformRunResult {
        operations: vec![schema::Operation::LineUpdate(schema::LineUpdateOperation {
            cart_line_id: max_cart_line.id().clone(),
            image: None,
            price: None,
            title: Some("CHICYA Vibe Pick ✦ Colour Clash Starter".to_string()),
        })],
    })
}
