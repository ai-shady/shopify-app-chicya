use super::schema;
use shopify_function::prelude::*;
use shopify_function::Result;

#[derive(Deserialize, Default)]
#[shopify_function(rename_all = "camelCase")]
pub struct Configuration {
    pub title_prefix: Option<String>,
}

#[shopify_function]
fn cart_delivery_options_transform_run(
    input: schema::cart_delivery_options_transform_run::CartDeliveryOptionsTransformRunInput,
) -> Result<schema::CartDeliveryOptionsTransformRunResult> {
    let no_changes = schema::CartDeliveryOptionsTransformRunResult { operations: vec![] };
    let default_prefix = "CHICYA".to_string();

    let prefix = match input.delivery_customization().metafield() {
        Some(metafield) => {
            let config: &Configuration = metafield.json_value();
            config
                .title_prefix
                .clone()
                .unwrap_or(default_prefix)
        }
        None => default_prefix,
    };

    let mut operations = vec![];

    for group in input.cart().delivery_groups() {
        for option in group.delivery_options() {
            let new_title = match option.title() {
                Some(title) if !title.trim().is_empty() => format!("{} · {}", prefix, title),
                _ => format!("{} Express", prefix),
            };
            operations.push(schema::Operation::DeliveryOptionRename(
                schema::DeliveryOptionRenameOperation {
                    delivery_option_handle: option.handle().clone(),
                    title: new_title,
                },
            ));
        }
    }

    if operations.is_empty() {
        return Ok(no_changes);
    }

    Ok(schema::CartDeliveryOptionsTransformRunResult { operations })
}
