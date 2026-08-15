use shopify_function::prelude::*;
use std::process;

pub mod checkout_validation_run;

#[typegen("schema.graphql")]
pub mod schema {
    #[query("src/checkout_validation_run.graphql")]
    pub mod checkout_validation_run {}
}

fn main() {
    log!("Please invoke a named export.");
    process::abort();
}