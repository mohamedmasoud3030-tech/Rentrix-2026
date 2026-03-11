# Page Status Documentation

## Empty Pages
- **Finance**: Empty, needs content or removal.
- **GeneralLedger**: Empty, needs content or removal.
- **PropertiesAndUnits**: Empty, needs content or removal.

## Pages with Loading or Errors
- **Dashboard**: Relies on `db.settings` and other `AppContext` data. Issues may arise if data is missing.
- **Settings**: Depends on `db.settings` and `db.governance`. Errors may occur if data is unavailable.
- **Financials**: Relies on financial data from `AppContext`. Missing data could cause issues.
- **Reports**: Uses `accountingService` for financial calculations. Errors may occur if data is incomplete.
- **PropertyMap**: Depends on `db.settings` and `contractBalances`. Missing data could cause issues.

## Pages with Broken Functionality
- **Contracts**: Issues with printing, editing, and data reliance on `db.contracts` and `contractBalances`.
- **Owners**: Supabase integration for adding, editing, and deleting. Errors may occur if Supabase operations fail.
- **Tenants**: Similar to Owners, relies on Supabase for CRUD operations.

## Recommendations
1. Verify `AppContext` data availability.
2. Ensure Supabase environment variables are correctly set.
3. Debug specific operations (e.g., printing, editing) in affected pages.
4. Address empty pages by adding content or removing them from routes/sidebar.