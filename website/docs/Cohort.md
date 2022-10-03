---
slug: cohort
---

# Cohort

## `Cohort.create`

When creating a new cohort, the configuration __must__ include `threshold`, `shares`, and `porterUri`.
We also make available the parameters `include` and `exclude` which can be used to filter particular Nodes.

```js
const config = {
    threshold: 3,
    shares: 5,
    porterUri: 'https://porter-ibex.nucypher.community',
};
const newCohort = await Cohort.create(config, include=[], exclude=[]);
```

## `Cohort.toJSON`

A cohort can be serialized to a JSON object so that it can be stored and re-used at a later time.

```js
const cohortJSON = newCohort.toJSON();
console.log(cohortJSON);
// {
//     "ursulaAddresses": [
//         "0x5cf1703a1c99a4b42eb056535840e93118177232",
//         "0x7fff551249d223f723557a96a0e1a469c79cc934",
//         "0x9c7c824239d3159327024459ad69bb215859bd25"
//     ],
//     "threshold": 2,
//     "shares": 3,
//     "porterUri": "https://porter-ibex.nucypher.community"
// }
```

## `Cohort.fromJSON`

Similarly, we can read in a valid JSON object to build a new Cohort.

```js
const importedCohort = Cohort.fromJSON(cohortJSON);
console.log(importedCohort);
// Cohort {
//     ursulaAddresses: [
//     '0x5cf1703a1c99a4b42eb056535840e93118177232',
//     '0x7fff551249d223f723557a96a0e1a469c79cc934',
//     '0x9c7c824239d3159327024459ad69bb215859bd25'
//     ],
//     configuration: {
//     threshold: 2,
//     shares: 3,
//     porterUri: 'https://porter-ibex.nucypher.community'
//     }
// }
```