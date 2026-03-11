<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/bd49d989-1823-4c97-9e4d-763aee8ba4a6

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## New Features

This release introduces several enhancements to the Rentrix ERP application that build on the existing modules without changing the underlying architecture:

- **Advanced reports with charts** – The Reports center now includes three new reports:
  - *Tenant Statement* – summarises each tenant’s contracts, payments and outstanding balances, with a bar chart showing the highest dues across tenants.
  - *Office Profit* – analyses the office’s commissions and expenses to calculate net profit, with a bar chart comparing commissions, expenses and net profit and a breakdown of expenses by category.
  - *Revenue & Expenses* – combines rent collections and commissions as revenue and compares them against all expenses, providing both a chart and detailed category tables.
  These reports use the new `SimpleBarChart` component to visualise data and `SummaryStatCard` for KPI snapshots.

- **Enhanced property map filtering** – The Property Map page now includes a search box that filters properties, units and tenant names. This keyword search works alongside the existing status filters (vacant, occupied, expiring, overdue, all) to quickly locate specific units or properties.

- **Improved documentation and testing guidance** – The project documentation now highlights how to run and extend tests. After installing dependencies, you can run any available tests with `npm run test`. When adding new features, consider writing unit tests for data aggregation functions and React components to ensure stability. The `SimpleBarChart` and new report components can be tested using a React testing library to verify that they render correctly with sample data.

These improvements are designed to integrate smoothly with existing pages and maintainers can build on them without rewriting any working functionality.

## UI Design Consistency

To ensure a cohesive look and feel across the application, a set of reusable UI components have been introduced:

- **TableWrapper / Th / Tr / Td** – These components wrap plain HTML tables with Tailwind classes for consistent spacing, borders and responsive overflow. Replace legacy `<table>` elements with `<TableWrapper>` and use `<Th>`, `<Tr>`, and `<Td>` for headings, rows and cells. This makes tables visually uniform, with subtle hover states and built‑in rounded borders.
- **SearchFilterBar** – Used on list pages (Owners, Tenants, Invoices, etc.) to provide quick keyword filtering with a single state prop. Always prefer this component over custom search inputs for consistency and accessibility.
- **StatusPill** – Displays statuses with colour‑coded pills (e.g. posted vs. void, active vs. inactive). Use this component for any enumerated state to convey meaning quickly without redefining styles.
- **SummaryStatCard / KpiCard** – Show KPI numbers and small charts in dashboards and report pages. These cards support icons, colours and subtext out of the box.

When extending the system, refer to existing pages such as `Owners.tsx` or `Tenants.tsx` for examples of how these components are composed. Consistent use of these primitives results in a unified interface and reduces bespoke CSS.

## Error Handling & Performance

Throughout the codebase, operations such as database writes and API calls are wrapped in `try/catch` blocks with toast notifications for the user. When adding new functionality, continue this pattern and consider providing more detailed messages or fallback behaviours when possible. For expensive list operations (e.g. filtering large arrays), memoise computations using `useMemo` and debounce search terms if the list can grow large. Indexing tables in the Supabase schema can also improve performance for frequent queries.
