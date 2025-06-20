# Condition Schemas

## AnyCondition

_Union of the following possible types:_

- [RpcCondition](#rpccondition)
- [TimeCondition](#timecondition)
- [AddressAllowlistCondition](#addressallowlistcondition)
- [ContractCondition](#contractcondition)
- [CompoundCondition](#compoundcondition)
- [JsonApiCondition](#jsonapicondition)
- [JsonRpcCondition](#jsonrpccondition)
- [JwtCondition](#jwtcondition)
- [SequentialCondition](#sequentialcondition)
- [IfThenElseCondition](#ifthenelsecondition)

## UserAddress

This is a context variable that will be replaced at decryption time. It represents the Ethereum address of the requester attempting decryption.

_Literal `':userAddress'` value._

## BaseCondition

_Object containing the following properties:_

| Property                 | Type     |
| :----------------------- | :------- |
| **`conditionType`** (\*) | `string` |

_(\*) Required._

## HttpsURL

_String which is a valid URL._

## JsonPath

A string containing either a valid JSON Path Expression, or a Context Parameter.

_String._

## PlainString

Any string that is not a Context Parameter i.e. does not start with `:`.

_String._

## BlockchainParamOrContextParam

_Union of the following possible types:_

- [PlainString](#plainstring), `boolean`, `number` (_int, ≥-9007199254740991, ≤9007199254740991_) _or_ `bigint` (_≤115792089237316195423570985008687907853269984665640564039457584007913129639935, ≥-57896044618658097711785492504343953926634992332820282019728792003956564819968_)
- [ContextParam](#contextparam)
- _Array of [BlockchainParamOrContextParam](#blockchainparamorcontextparam) items_

## ContextParam

A Context Parameter i.e. a placeholder used within conditions and specified at the encryption time, whose value is provided at decryption time.

_String which matches the regular expression `/^:[a-zA-Z_][a-zA-Z0-9_]*$/`._

## ParamOrContextParam

_Union of the following possible types:_

- [PlainString](#plainstring), `boolean`, `number` _or_ `bigint`
- [ContextParam](#contextparam)
- _Array of [ParamOrContextParam](#paramorcontextparam) items_

## CompoundCondition

_Object containing the following properties:_

| Property            | Type                                                                      | Default      |
| :------------------ | :------------------------------------------------------------------------ | :----------- |
| `conditionType`     | `'compound'`                                                              | `'compound'` |
| **`operator`** (\*) | `'and' \| 'or' \| 'not'`                                                  |              |
| **`operands`** (\*) | _Array of at least 1  and  at most 5 [AnyCondition](#anycondition) items_ |              |

_(\*) Required._

## ContractCondition

_Object containing the following properties:_

| Property                   | Type                                                                             | Default      |
| :------------------------- | :------------------------------------------------------------------------------- | :----------- |
| `conditionType`            | `'contract'`                                                                     | `'contract'` |
| **`chain`** (\*)           | `number` (_int, ≥0_)                                                             |              |
| **`method`** (\*)          | `string`                                                                         |              |
| **`parameters`** (\*)      | _Array of [BlockchainParamOrContextParam](#blockchainparamorcontextparam) items_ |              |
| **`returnValueTest`** (\*) | [BlockchainReturnValueTest](#blockchainreturnvaluetest)                          |              |
| **`contractAddress`** (\*) | `string`                                                                         |              |
| `standardContractType`     | `'ERC20' \| 'ERC721'`                                                            |              |
| `functionAbi`              | [FunctionAbi](#functionabi)                                                      |              |

_(\*) Required._

## FunctionAbi

_Object containing the following properties:_

| Property                   | Type                                                                   |
| :------------------------- | :--------------------------------------------------------------------- |
| **`name`** (\*)            | `string`                                                               |
| **`type`** (\*)            | `'function'`                                                           |
| **`inputs`** (\*)          | _Array of at least 0 [FunctionAbiVariable](#functionabivariable) item_ |
| **`outputs`** (\*)         | _Array of at least 1 [FunctionAbiVariable](#functionabivariable) item_ |
| **`stateMutability`** (\*) | `'view' \| 'pure'`                                                     |

_(\*) Required._

## FunctionAbiVariable

_Object containing the following properties:_

| Property                | Type                                                                                                                                                                                                                                                                 |
| :---------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`name`** (\*)         | `string`                                                                                                                                                                                                                                                             |
| **`type`** (\*)         | `'bool' \| 'string' \| 'address' \| 'address payable' \| 'bytes1' \| 'bytes2' \| 'bytes3' \| 'bytes4' \| 'bytes5' \| 'bytes6' \| 'bytes7' \| 'bytes8' \| 'bytes9' \| 'bytes10' \| 'bytes11' \| 'bytes12' \| 'bytes13' \| 'bytes14' \| 'bytes15' \| 'bytes16' \| ...` |
| **`internalType`** (\*) | `'bool' \| 'string' \| 'address' \| 'address payable' \| 'bytes1' \| 'bytes2' \| 'bytes3' \| 'bytes4' \| 'bytes5' \| 'bytes6' \| 'bytes7' \| 'bytes8' \| 'bytes9' \| 'bytes10' \| 'bytes11' \| 'bytes12' \| 'bytes13' \| 'bytes14' \| 'bytes15' \| 'bytes16' \| ...` |

_(\*) Required._

## IfThenElseCondition

_Object containing the following properties:_

| Property                 | Type                                         | Default          |
| :----------------------- | :------------------------------------------- | :--------------- |
| `conditionType`          | `'if-then-else'`                             | `'if-then-else'` |
| **`ifCondition`** (\*)   | [AnyCondition](#anycondition)                |                  |
| **`thenCondition`** (\*) | [AnyCondition](#anycondition)                |                  |
| **`elseCondition`** (\*) | [AnyCondition](#anycondition) _or_ `boolean` |                  |

_(\*) Required._

## JsonApiCondition

_Object containing the following properties:_

| Property                   | Type                                                                                               | Default      |
| :------------------------- | :------------------------------------------------------------------------------------------------- | :----------- |
| `conditionType`            | `'json-api'`                                                                                       | `'json-api'` |
| **`endpoint`** (\*)        | [HttpsURL](#httpsurl)                                                                              |              |
| `parameters`               | _Object with dynamic keys of type_ `string` _and values of type_ `unknown` (_optional & nullable_) |              |
| `query`                    | [JsonPath](#jsonpath)                                                                              |              |
| `authorizationToken`       | [ContextParam](#contextparam)                                                                      |              |
| **`returnValueTest`** (\*) | [ReturnValueTest](#returnvaluetest)                                                                |              |

_(\*) Required._

## JsonRpcCondition

_Object containing the following properties:_

| Property                   | Type                                                                                                                     | Default      |
| :------------------------- | :----------------------------------------------------------------------------------------------------------------------- | :----------- |
| `conditionType`            | `'json-rpc'`                                                                                                             | `'json-rpc'` |
| **`endpoint`** (\*)        | [HttpsURL](#httpsurl)                                                                                                    |              |
| **`method`** (\*)          | `string`                                                                                                                 |              |
| `params`                   | `Array<unknown>` _or_ _Object with dynamic keys of type_ `string` _and values of type_ `unknown` (_optional & nullable_) |              |
| `query`                    | [JsonPath](#jsonpath)                                                                                                    |              |
| `authorizationToken`       | [ContextParam](#contextparam)                                                                                            |              |
| **`returnValueTest`** (\*) | [ReturnValueTest](#returnvaluetest)                                                                                      |              |

_(\*) Required._

## JwtCondition

_Object containing the following properties:_

| Property             | Type                          | Default       |
| :------------------- | :---------------------------- | :------------ |
| `conditionType`      | `'jwt'`                       | `'jwt'`       |
| **`publicKey`** (\*) | `string`                      |               |
| `expectedIssuer`     | `string`                      |               |
| `jwtToken`           | [ContextParam](#contextparam) | `':jwtToken'` |

_(\*) Required._

## BlockchainReturnValueTest

_Object containing the following properties:_

| Property              | Type                                                            |
| :-------------------- | :-------------------------------------------------------------- |
| `index`               | `number` (_int, ≥0_)                                            |
| **`comparator`** (\*) | `'==' \| '>' \| '<' \| '>=' \| '<=' \| '!='`                    |
| **`value`** (\*)      | [BlockchainParamOrContextParam](#blockchainparamorcontextparam) |

_(\*) Required._

## ReturnValueTest

_Object containing the following properties:_

| Property              | Type                                         |
| :-------------------- | :------------------------------------------- |
| `index`               | `number` (_int, ≥0_)                         |
| **`comparator`** (\*) | `'==' \| '>' \| '<' \| '>=' \| '<=' \| '!='` |
| **`value`** (\*)      | [ParamOrContextParam](#paramorcontextparam)  |

_(\*) Required._

## RpcCondition

RPC Condition for calling [Ethereum JSON RPC APIs](https://ethereum.github.io/execution-apis/api-documentation/)

_Object containing the following properties:_

| Property                   | Description                               | Type                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Default |
| :------------------------- | :---------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------ |
| `conditionType`            |                                           | `'rpc'`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | `'rpc'` |
| **`chain`** (\*)           |                                           | `number` (_int, ≥0_)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |         |
| **`method`** (\*)          | Only 'eth_getBalance' method is supported | `'eth_getBalance'`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |         |
| **`parameters`** (\*)      |                                           | _Tuple:_<ol><li>`string`, [UserAddress](#useraddress) _or_ [ContextParam](#contextparam)</li><li>`number` (_int, ≥0_), `string` (_regex: `/^0x[a-fA-F0-9]{64}$/`_) _or_ `'earliest' \| 'finalized' \| 'safe' \| 'latest' \| 'pending'` _or_ [ContextParam](#contextparam)</li></ol> Description: Spec requires 2 parameters - an address and a block identifier<br /> <br /> _or_ _Tuple:_<ol><li>`string`, [UserAddress](#useraddress) _or_ [ContextParam](#contextparam)</li></ol> Description: Block identifier, which defaults to 'latest' if not specified<br /> <br /> |         |
| **`returnValueTest`** (\*) |                                           | [BlockchainReturnValueTest](#blockchainreturnvaluetest)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |         |

_(\*) Required._

## ConditionVariable

_Object containing the following properties:_

| Property             | Type                          |
| :------------------- | :---------------------------- |
| **`varName`** (\*)   | [PlainString](#plainstring)   |
| **`condition`** (\*) | [AnyCondition](#anycondition) |

_(\*) Required._

## SequentialCondition

_Object containing the following properties:_

| Property                      | Type                                                                                | Default        |
| :---------------------------- | :---------------------------------------------------------------------------------- | :------------- |
| `conditionType`               | `'sequential'`                                                                      | `'sequential'` |
| **`conditionVariables`** (\*) | _Array of at least 2  and  at most 5 [ConditionVariable](#conditionvariable) items_ |                |

_(\*) Required._

## TimeCondition

_Object containing the following properties:_

| Property                   | Type                                                    | Default       |
| :------------------------- | :------------------------------------------------------ | :------------ |
| `conditionType`            | `'time'`                                                | `'time'`      |
| **`chain`** (\*)           | `number` (_int, ≥0_)                                    |               |
| `method`                   | `'blocktime'`                                           | `'blocktime'` |
| **`returnValueTest`** (\*) | [BlockchainReturnValueTest](#blockchainreturnvaluetest) |               |

_(\*) Required._

## AddressAllowlistCondition

_Object containing the following properties:_

| Property                 | Description                                                                                                                                     | Type                                |
| :----------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------- |
| **`conditionType`** (\*) |                                                                                                                                                 | `'address-allowlist'`               |
| **`userAddress`** (\*)   | This is a context variable that will be replaced at decryption time. It represents the Ethereum address of the requester attempting decryption. | [UserAddress](#useraddress)         |
| **`addresses`** (\*)     | List of wallet addresses allowed to decrypt. Addresses should be provided in checksummed form. Matching is case-sensitive.                      | `Array<string>` (_min: 1, max: 25_) |

_(\*) Required._

## More resources

For more information, please refer to the TACo documentation:
https://docs.taco.build/.

Visit the TACo Playground to see the condition schemas in action: https://playground.taco.build/.
