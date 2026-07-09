# Contributing

Thanks for taking a look at Gear Match. The project is early-stage, so the
most useful contributions are small, verifiable improvements.

## Good First Contributions

- Fix camera or lens metadata in `src/data/segments/`.
- Add reliable product image mappings in `src/data/images.js`.
- Improve translations in `src/i18n/`.
- Add tests for search, currency, store-link, or i18n behavior.
- Improve accessibility for the questionnaire and result cards.
- Improve documentation for deployment, data sources, and QA.

## Local Development

```bash
npm ci
npm run dev
npm run lint
npm test
npm run build
```

## Data Quality Rules

- Prefer official manufacturer pages, Wikimedia Commons, or other stable
  sources that allow linking or reuse.
- Do not add scraped private data, copied commercial product descriptions, or
  images with unclear licensing.
- Keep recommendation behavior explainable: if a score changes, update or add
  tests where practical.
- Keep region-specific store links as search links unless an affiliate or paid
  partnership is explicitly documented in the future.

## Pull Request Checklist

- The change is scoped and easy to review.
- `npm run lint`, `npm test`, and `npm run build` pass locally.
- New logic has tests or a short explanation for why tests are not practical.
- User-facing copy is translated or intentionally limited to one locale.

## Maintainer Notes

This repository is maintained as a public learning and utility project. Issues
and pull requests are welcome, especially when they make the data model,
recommendation logic, or multilingual experience easier to reuse.
