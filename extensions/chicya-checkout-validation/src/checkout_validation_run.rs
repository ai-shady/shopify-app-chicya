use super::schema;
use shopify_function::prelude::*;
use shopify_function::Result;

#[shopify_function]
fn checkout_validation_run(
    input: schema::checkout_validation_run::CheckoutValidationRunInput,
) -> Result<schema::CartValidationsGenerateRunResult> {
    use schema::checkout_validation_run::checkout_validation_run_input::cart::lines::Merchandise;

    let requested = input
        .cart()
        .requested_free_gift()
        .map(|m| m.value().trim() == "true")
        .unwrap_or(false);

    if !requested {
        return Ok(schema::CartValidationsGenerateRunResult {
            operations: vec![schema::Operation::ValidationAdd(schema::ValidationAddOperation {
                errors: vec![],
            })],
        });
    }

    let gift_variant_id = input
        .cart()
        .gift_variant_id()
        .map(|m| m.value().trim())
        .filter(|v| !v.is_empty())
        .unwrap_or("");

    let gift_in_cart = input
        .cart()
        .lines()
        .iter()
        .any(|line| match line.merchandise() {
            Merchandise::ProductVariant(v) => v.id() == gift_variant_id,
            _ => false,
        });

    if gift_in_cart {
        return Ok(schema::CartValidationsGenerateRunResult {
            operations: vec![schema::Operation::ValidationAdd(schema::ValidationAddOperation {
                errors: vec![],
            })],
        });
    }

    Ok(schema::CartValidationsGenerateRunResult {
        operations: vec![schema::Operation::ValidationAdd(schema::ValidationAddOperation {
            errors: vec![schema::ValidationError {
                message: "Your free gift is missing. Please add it back or uncheck the free-gift option."
                    .to_string(),
                target: "$.cart".to_string(),
            }],
        })],
    })
}