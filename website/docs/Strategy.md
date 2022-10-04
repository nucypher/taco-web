---
slug: strategy
---

# Strategy

A Strategy combines all possible configuration parameters for using [CBD](./cdb).
It takes the following parameters:

- `cohort` - a [`Cohort`](./cohort) object
- `startDate` - the Strategy is valid from this date onwards
- `endDate`- the Strategy becomes invalid after this date
- `conditionSet?` - an optional [`ConditionSet`](./condition_set). If used, all encryptions made via this strategy have a default Condition Set assigned
- `aliceSecretKey?` - an optional Secret Key for the encrypter
- `bobSecretKey?` - an optional SecretKey for decrypter

## Create a Strategy

## Deploy a Strategy

## Import and Export Strategies