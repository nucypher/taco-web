# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [0.7.7](https://github.com/nucypher/nucypher-ts/compare/v0.7.6...v0.7.7) (2022-08-16)

### [0.7.6](https://github.com/nucypher/nucypher-ts/compare/v0.7.5...v0.7.6) (2022-08-16)

### [0.7.5](https://github.com/nucypher/nucypher-ts/compare/v0.7.0...v0.7.5) (2022-08-15)


### Features

* expose encrypted treasue map type ([1c18001](https://github.com/nucypher/nucypher-ts/commit/1c1800185fcc9a0600f38372624a6e54a924fe9f))
* expose more types ([fd0f857](https://github.com/nucypher/nucypher-ts/commit/fd0f8575dfb3546359efa27b199536e393f67b98))
* expose pre enacted policy type ([e54099e](https://github.com/nucypher/nucypher-ts/commit/e54099e0c23902347596e9ac272baac132a0044f))


### Bug Fixes

* **test:** add mocks to tdec test suite ([554c255](https://github.com/nucypher/nucypher-ts/commit/554c255e38e2e91f69c1e65950ec9ba2ed871a9a))

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
