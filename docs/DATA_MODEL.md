# Data Model

Gear Match stores recommendation data as plain JavaScript modules so changes
can be reviewed in pull requests without a database or build-time service.

## Camera And Lens Segments

Camera data lives in `src/data/segments/cam_*.js`.
Lens data lives in `src/data/segments/lens_*.js`.

Each segment exports `SEG`, an array of product records.

Common fields:

- `name`: Display name and search query base.
- `brand`: Product manufacturer.
- `price`: Approximate price in JPY before region-specific formatting.
- `mount`: Camera mount or lens mount.
- `use`: One or more of `photo`, `video`, or `both`.
- `strengths`: Short human-readable reason tags.
- `params`: Scoring parameters on a 1-5 scale.

Camera-specific fields:

- `sensor`: Human-readable sensor class.
- `sensorRank`: Coarse sensor-size ranking for comparison.

Lens-specific fields:

- `focalType`: One of the recommendation focal categories, such as `wide`,
  `tele`, `prime`, or `allround`.
- `focalMin`: Minimum focal length.
- `focalMax`: Maximum focal length.

## Aggregation

`src/data/cameras.js` imports and merges the camera segment modules.
`src/data/lenses.js` imports and merges the lens segment modules.

Segment files keep review diffs smaller than one monolithic catalog file.

## Recommendation Logic

`src/lib/search.js` handles:

- Filtering by gear type, purpose, mount, budget, and condition.
- Used-price approximation with shared grade factors.
- Subject matching for lens focal length.
- Priority scoring for video, low light, stabilization, macro, bokeh, recent
  release, weather resistance, and other user-selected needs.
- Sorting by recommendation score, price, or recency.

Budget filtering is strict: products over the chosen effective budget are not
shown.

## Region Store Links

`src/lib/storeLinks.js` maps 13 regions to store-search URLs.

The app currently links to search pages rather than direct affiliate links.
When the user chooses new-condition results, used-market stores marked with
`used: true` are excluded to avoid misleading new-price comparisons.

## Images

`src/data/images.js` maps product names to verified image URLs.

Image tooling:

- `build-images-safe.mjs`: safer additive image lookup and validation flow.
- `build-images.mjs`: broad lookup flow, kept for development but not the
  preferred maintenance path.
- `build-step-images.mjs`: step-screen image helper.

Image contributions should use stable sources with clear linking or reuse
rights, such as Wikimedia Commons or manufacturer-controlled media pages.

