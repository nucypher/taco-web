---
slug: reusable_cohort
---

# Create Security Optionality With Re-usable Cohorts

Providing configurable security to your users is easy with re-usable [Cohorts](./cohort).
Below we define 3 cohorts; small, medium, and large.
`smallCohort`, `mediumCohort`, and `largeCohort` can then be re-used by multiple [Strategies](./strategy).

```js
const smallConfig = {
  threshold: 3,
  shares: 5,
  porterUri: 'https://porter.nucypher.community',
};
const mediumConfig = {
  threshold: 11,
  shares: 20,
  porterUri: 'https://porter.nucypher.community',
};
const largeConfig = {
  threshold: 51,
  shares: 100,
  porterUri: 'https://porter.nucypher.community',
};
const smallCohort = await Cohort.create(smallConfig);
const mediumCohort = await Cohort.create(mediumConfig);
const largeCohort = await Cohort.create(largeConfig);
```
