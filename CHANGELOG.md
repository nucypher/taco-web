# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [1.0.0-beta.1](https://github.com/nucypher/nucypher-ts/compare/v1.0.0-beta.0...v1.0.0-beta.1) (2023-03-27)

### ⚠ BREAKING CHANGES
* `TimeLockCondition` no longer supported; instead `TimeCondition` with method name `blocktime` can be used

### ⚠ BREAKING CHANGES

* Pass provider to retireveAndDecrypt instead of ConditionContext (#135)
* replace Web3Provider with direct usage of ethers.provider.Web3Provider
* set main package entry to commonjs module

### Features

* expose startDate and endDate as strategy params ([56a10da](https://github.com/nucypher/nucypher-ts/commit/56a10dabcc79a6cc5c535b565da60b827277d413))
* replace Web3Provider with direct usage of ethers.provider.Web3Provider ([206f08e](https://github.com/nucypher/nucypher-ts/commit/206f08e2a919aaddee2c7c08733787f3415dae71))
* set main package entry to commonjs module ([214e858](https://github.com/nucypher/nucypher-ts/commit/214e85848f293257b2fcc40521a4c72db116e5aa))


### Bug Fixes

* remove unused provider parameter ([805b93c](https://github.com/nucypher/nucypher-ts/commit/805b93cd12b16bebadab07dcb45643710b6123e5))


* Pass provider to retireveAndDecrypt instead of ConditionContext ([#135](https://github.com/nucypher/nucypher-ts/issues/135)) ([4fe98fc](https://github.com/nucypher/nucypher-ts/commit/4fe98fc8d158158eb14f8192376113de5f605ceb))

## [1.0.0-beta.0](https://github.com/nucypher/nucypher-ts/compare/v0.9.0...v1.0.0-beta.0) (2023-03-27)

## [0.9.0](https://github.com/nucypher/nucypher-ts/compare/v0.7.9-alpha.26...v0.9.0) (2022-12-07)


### ⚠ BREAKING CHANGES

* bump node to >=16

### Features

* update nucypher-core to 0.4.0-alpha.0 ([3b85b20](https://github.com/nucypher/nucypher-ts/commit/3b85b203f0c317e28c2479ae943e33e89d8745b4))


### Bug Fixes

* escaping porter url ([08b1b03](https://github.com/nucypher/nucypher-ts/commit/08b1b031babd040d6c1c3cf1993990687e1f8b0e))
* force dependency resolution for nucypher-core ([4201b14](https://github.com/nucypher/nucypher-ts/commit/4201b14532a237deaa6a69dcf8e1510a2ded75d0))


* bump node to >=16 ([4b7994d](https://github.com/nucypher/nucypher-ts/commit/4b7994d28eca6af3e1710d3ea3b0e174bd2f1256))

### [0.9.0-alpha.0](https://github.com/nucypher/nucypher-ts/compare/v0.8.1...v0.8.2) (2022-11-14)

### [0.8.2](https://github.com/nucypher/nucypher-ts/compare/v0.8.1...v0.8.2) (2022-10-03)

### Bug Fixes

* force dependency resolution for nucypher-core ([2329a22](https://github.com/nucypher/nucypher-ts/commit/2329a22834cff5bc74eebfc9027e0e8ced77cb38))

### [0.8.1](https://github.com/nucypher/nucypher-ts/compare/v0.7.4...v0.8.1) (2022-09-20)

### Bug Fixes

* escaping porter url ([5a9e68c](https://github.com/nucypher/nucypher-ts/commit/5a9e68c35f0c48d7333a9a57f1c1988982827267))

## [0.8.0](https://github.com/nucypher/nucypher-ts/compare/v0.7.4...v0.8.0) (2022-09-20)


### Features

* update nucypher-core to 0.4.0-alpha.0 ([99ed65b](https://github.com/nucypher/nucypher-ts/commit/99ed65b284d262f8efe737c1bef0343d6d8ca92d))


### Bug Fixes

* escaping porter url ([5a9e68c](https://github.com/nucypher/nucypher-ts/commit/5a9e68c35f0c48d7333a9a57f1c1988982827267))

### [0.7.9-alpha.26](https://github.com/nucypher/nucypher-ts/compare/v0.7.9-alpha.25...v0.7.9-alpha.26) (2022-11-14)

### [0.7.9-alpha.25](https://github.com/nucypher/nucypher-ts/compare/v0.7.9-alpha.24...v0.7.9-alpha.25) (2022-11-11)

### [0.7.9-alpha.24](https://github.com/nucypher/nucypher-ts/compare/v0.7.9-alpha.23...v0.7.9-alpha.24) (2022-11-09)

### [0.7.9-alpha.23](https://github.com/nucypher/nucypher-ts/compare/v0.7.9-alpha.22...v0.7.9-alpha.23) (2022-11-07)

### [0.7.9-alpha.22](https://github.com/nucypher/nucypher-ts/compare/v0.7.9-alpha.21...v0.7.9-alpha.22) (2022-11-07)

### [0.7.9-alpha.21](https://github.com/nucypher/nucypher-ts/compare/v0.7.9-alpha.18...v0.7.9-alpha.21) (2022-11-05)

### [0.7.9-alpha.20](https://github.com/nucypher/nucypher-ts/compare/v0.7.9-alpha.18...v0.7.9-alpha.20) (2022-10-11)

### [0.7.9-alpha.18](https://github.com/nucypher/nucypher-ts/compare/v0.7.9-alpha.17...v0.7.9-alpha.18) (2022-09-30)

### [0.7.9-alpha.17](https://github.com/nucypher/nucypher-ts/compare/v0.7.9-alpha.16...v0.7.9-alpha.17) (2022-09-26)

### [0.7.9-alpha.16](https://github.com/nucypher/nucypher-ts/compare/v0.7.9-alpha.15...v0.7.9-alpha.16) (2022-09-26)

### [0.7.9-alpha.15](https://github.com/nucypher/nucypher-ts/compare/v0.7.9-alpha.14...v0.7.9-alpha.15) (2022-09-23)

### [0.7.9-alpha.14](https://github.com/nucypher/nucypher-ts/compare/v0.7.9-alpha.12...v0.7.9-alpha.14) (2022-09-22)

### [0.7.9-alpha.13](https://github.com/nucypher/nucypher-ts/compare/v0.7.9-alpha.12...v0.7.9-alpha.13) (2022-09-22)

### [0.7.9-alpha.12](https://github.com/nucypher/nucypher-ts/compare/v0.7.9-alpha.11...v0.7.9-alpha.12) (2022-09-15)

### [0.7.9-alpha.11](https://github.com/nucypher/nucypher-ts/compare/v0.7.9-alpha.10...v0.7.9-alpha.11) (2022-09-15)

### [0.7.9-alpha.10](https://github.com/nucypher/nucypher-ts/compare/v0.7.9-alpha.9...v0.7.9-alpha.10) (2022-09-14)

### [0.7.9-alpha.9](https://github.com/nucypher/nucypher-ts/compare/v0.7.9-alpha.8...v0.7.9-alpha.9) (2022-09-13)

### [0.7.9-alpha.8](https://github.com/nucypher/nucypher-ts/compare/v0.7.9-alpha.7...v0.7.9-alpha.8) (2022-09-13)

### [0.7.9-alpha.7](https://github.com/nucypher/nucypher-ts/compare/v0.7.9-alpha.6...v0.7.9-alpha.7) (2022-09-13)

### [0.7.9-alpha.6](https://github.com/nucypher/nucypher-ts/compare/v0.7.9-alpha.5...v0.7.9-alpha.6) (2022-09-13)

### [0.7.9-alpha.5](https://github.com/nucypher/nucypher-ts/compare/v0.7.9-alpha.4...v0.7.9-alpha.5) (2022-09-12)

### [0.7.9-alpha.4](https://github.com/nucypher/nucypher-ts/compare/v0.7.9-alpha.3...v0.7.9-alpha.4) (2022-09-12)

### [0.7.9-alpha.3](https://github.com/nucypher/nucypher-ts/compare/v0.7.9-alpha.2...v0.7.9-alpha.3) (2022-09-12)

### [0.7.9-alpha.2](https://github.com/nucypher/nucypher-ts/compare/v0.7.9-alpha.1...v0.7.9-alpha.2) (2022-08-25)

### [0.7.9-alpha.1](https://github.com/nucypher/nucypher-ts/compare/v0.7.4...v0.7.9-alpha.1) (2022-08-19)

### [0.7.9-alpha.0](https://github.com/nucypher/nucypher-ts/compare/v0.7.8...v0.7.9-alpha.0) (2022-08-16)

### [0.7.4](https://github.com/nucypher/nucypher-ts/compare/v0.7.3...v0.7.4) (2022-08-10)

### [0.7.3](https://github.com/nucypher/nucypher-ts/compare/v0.7.2...v0.7.3) (2022-08-10)


### Features

* expose more types ([fd0f857](https://github.com/nucypher/nucypher-ts/commit/fd0f8575dfb3546359efa27b199536e393f67b98))

### [0.7.2](https://github.com/nucypher/nucypher-ts/compare/v0.7.1...v0.7.2) (2022-07-27)


### Features

* expose pre enacted policy type ([e54099e](https://github.com/nucypher/nucypher-ts/commit/e54099e0c23902347596e9ac272baac132a0044f))

### [0.7.1](https://github.com/nucypher/nucypher-ts/compare/v0.7.0...v0.7.1) (2022-07-16)


### Features

* expose encrypted treasue map type ([1c18001](https://github.com/nucypher/nucypher-ts/commit/1c1800185fcc9a0600f38372624a6e54a924fe9f))

## [0.7.0](https://github.com/nucypher/nucypher-ts/compare/v0.6.1...v0.7.0) (2022-04-14)

### ⚠ BREAKING CHANGES

* In public API, use SecretKey directly instead of raw secret key bytes

### Features

* Add default config per network ([25a84f1](https://github.com/nucypher/nucypher-ts/commit/25a84f153c46ddd8346f14fc30041f13faaa82e3))
* Add Polygon mainnet contract config ([98ad251](https://github.com/nucypher/nucypher-ts/commit/98ad251d7b9a007b47f589fee80386f87da539d5))
* Expose SecretKey from nucypher-core ([64ac724](https://github.com/nucypher/nucypher-ts/commit/64ac724c3506ebdcfa08bd83ed538ac1006fb0d2))
* In public API, use SecretKey directly instead of raw secret key bytes ([868ff43](https://github.com/nucypher/nucypher-ts/commit/868ff437a7973543cd3f391cca0bfc86bafcb76a))
* Validate Porter URI ([399c306](https://github.com/nucypher/nucypher-ts/commit/399c30673ec4093a5a5d8c0169f0abf7de023b8e))


### Bug Fixes

* Expose Configuration type ([4414fd4](https://github.com/nucypher/nucypher-ts/commit/4414fd49f406d3760dece9663cbd0f881cafd946))

### [0.6.1](https://github.com/nucypher/nucypher-ts/compare/v0.6.0...v0.6.1) (2022-03-26)


### Bug Fixes

* Fix number overflow ([60f6c91](https://github.com/nucypher/nucypher-ts/commit/60f6c914797c5cf399fd8010c0386c880bd8bfb6))
* Remove hardcoded gas limit ([ab1a776](https://github.com/nucypher/nucypher-ts/commit/ab1a776c97024c9c40f7f19a76a94ec96344816f))

## [0.6.0](https://github.com/nucypher/nucypher-ts/compare/v0.5.0...v0.6.0) (2022-03-16)


### Features

* Update policy smart contracts ([320117a](https://github.com/nucypher/nucypher-ts/commit/320117a22f5e30313ef46a4f5f256f608549ca45))
* Update Porter client ([0df3ea2](https://github.com/nucypher/nucypher-ts/commit/0df3ea233d7de4fb8f1bd1464b9204d6a20e21e0))


### Bug Fixes

* Generating code in postinstall ([64d6cba](https://github.com/nucypher/nucypher-ts/commit/64d6cba55ba09931f9d057e8ab4578a2e7c87443))
* Remove deprecated revocations ([4971886](https://github.com/nucypher/nucypher-ts/commit/4971886696b9736cb987d818642421068081b820))
* Set correct contract address ([1e78e39](https://github.com/nucypher/nucypher-ts/commit/1e78e39d993f9d258369cb7470492d7ebc788005))

### [0.5.1](https://github.com/nucypher/nucypher-ts/compare/v0.5.0...v0.5.1) (2022-02-07)

## [0.5.0](https://github.com/nucypher/nucypher-ts/compare/v0.4.3...v0.5.0) (2022-01-18)


### Features

* Enact policies with a different publisher ([725d25c](https://github.com/nucypher/nucypher-ts/commit/725d25c761b166d5bb227ed97688f142af2b5e60))


### Bug Fixes

* **src/policies/hrac.ts:** changed label string encoding used by HRAC to utf-8 ([59769cc](https://github.com/nucypher/nucypher-ts/commit/59769cc515aa4d15a2bcf8c626569c021afa9732))

### [0.4.3](https://github.com/nucypher/nucypher-ts/compare/v0.4.2...v0.4.3) (2021-11-27)


### Features

* Set default fee rate for policyfrom global min fee ([466fca2](https://github.com/nucypher/nucypher-ts/commit/466fca24aab0d74e607721a6ad837939141b095f))

### [0.4.2](https://github.com/nucypher/nucypher-ts/compare/v0.4.0-alpha...v0.4.2) (2021-11-25)


### Bug Fixes

* Transaction value integer overflow ([a397859](https://github.com/nucypher/nucypher-ts/commit/a3978597cede067beadcb556bc754b4fcf8c685f))

### [0.4.1-alpha](https://github.com/nucypher/nucypher-ts/compare/v0.4.0-alpha...v0.4.1-alpha) (2021-11-22)


### Bug Fixes

* Transaction value integer overflow ([a397859](https://github.com/nucypher/nucypher-ts/commit/a3978597cede067beadcb556bc754b4fcf8c685f))

## [0.4.0-alpha](https://github.com/nucypher/nucypher-ts/compare/v0.3.1-alpha...v0.4.0-alpha) (2021-11-22)


### Bug Fixes

* Gas limit too low when creating policies ([b2842de](https://github.com/nucypher/nucypher-ts/commit/b2842de15ec8df97c03ad5035557bee37c616eaf))

### [0.3.1-alpha](https://github.com/nucypher/nucypher-ts/compare/v0.3.0-alpha...v0.3.1-alpha) (2021-11-17)


### Features

* Alice only revokes non-disabled policies ([2f1290b](https://github.com/nucypher/nucypher-ts/commit/2f1290b2a940a813deca7d0b128ee042b76288eb))
* Alice revokes on-chain policy access ([9432c59](https://github.com/nucypher/nucypher-ts/commit/9432c598b5b6e420764e84bd09b1a8e4fc0b2d6b))

## [0.3.0-alpha](https://github.com/nucypher/nucypher-ts/compare/v0.2.0-alpha...v0.3.0-alpha) (2021-11-14)


### Features

* Update protocol entities in accordance to nucypher-core ([f0444e1](https://github.com/nucypher/nucypher-ts/commit/f0444e13615bc956ba271e80b8cc6a3ae8e49619))

## [0.2.0-alpha](https://github.com/nucypher/nucypher-ts/compare/v0.1.1-alpha...v0.2.0-alpha) (2021-10-14)

### Features

* Implement versioned
  entities ([28b289a](https://github.com/nucypher/nucypher-ts/commit/28b289ab4dce18e30678cf6232a8a96eb4f8d473))
* Use web3 provider to handle
  txs ([48d71dc](https://github.com/nucypher/nucypher-ts/commit/48d71dcb00d10d0f374e933006056e16ee5a75b0))

### Bug Fixes

* Verify capsule fragments from
  Porter ([00ab102](https://github.com/nucypher/nucypher-ts/commit/00ab102a55f97d2c60bb38c248d89ea749d53caf))

## [0.1.2-alpha](https://github.com/nucypher/nucypher-ts/compare/v0.1.1-alpha...v0.1.2-alpha) (2021-10-04)

### Features

* Use web3 provider to handle
  txs ([48d71dc](https://github.com/nucypher/nucypher-ts/commit/48d71dcb00d10d0f374e933006056e16ee5a75b0))

### Bug Fixes

* Verify capsule fragments from
  Porter ([00ab102](https://github.com/nucypher/nucypher-ts/commit/00ab102a55f97d2c60bb38c248d89ea749d53caf))

## [0.1.1-alpha](https://github.com/nucypher/nucypher-ts/compare/v0.1.0-alpha...v0.1.1-alpha) (2021-09-30)

## 0.1.0-alpha (2021-09-30)

### Features

* Alice grants
  workflow ([7a7c3cd](https://github.com/nucypher/nucypher-ts/commit/7a7c3cd66909841eb2b10a3001f4df75ca6c006a))
