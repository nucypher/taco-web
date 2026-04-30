---
name: taco-condition-authoring
description: "Use when: authoring TACo access-control or action-control conditions with LLM assistance. Provides canonical prompt template, constraint rules, examples, and validation workflow for generating valid JSON conditions."
---

# TACo Condition Authoring with LLMs

**What this is:** A self-contained workflow for using Claude, ChatGPT, or other LLMs to author valid TACo conditions in JSON. Copy the prompt template below into your LLM of choice, iterate until the validator is happy, then deploy.

**Why LLMs?** TACo conditions are JSON with 20+ condition types and complex composition rules. Hand-authoring is error-prone. LLMs excel at this when given schema + examples + constraints.

**Time to valid condition:** 1–3 LLM iterations (typically under 5 minutes with this workflow).

---

## Quick Start

1. **Copy the prompt template** (see "Prompt Template" section below) into Claude, ChatGPT, or your LLM of choice, starting a new conversation.
2. **Describe your access policy** in plain English in place of `<describe your access policy in plain English>`.
3. **Save the JSON output** as `conditions.json`.
4. **Run the validator** (section "Validate & Iterate" below).
5. **Fix any errors** by pasting the validator output back to the LLM.

---

## Prompt Template

Copy and paste this verbatim into your LLM conversation. Modify only the section marked `<...>`.

```
You are helping me author a TACo condition in JSON. TACo conditions define access policies: when an encrypted ciphertext can be decrypted, or when a transaction can be signed.

---

REFERENCE MATERIAL (please read before generating any condition)

0. Official LLM authoring guide (read this first for overview):
   https://docs.taco.build/for-developers/taco-sdk/references/conditions/building-with-llms

1. Canonical JSON Schema (source of truth):
   https://raw.githubusercontent.com/nucypher/taco-web/signing-epic/packages/taco/schema-docs/condition-schema.json

2. Human-readable schema reference:
   https://github.com/nucypher/taco-web/blob/signing-epic/packages/taco/schema-docs/condition-schemas.md

3. Working examples for every condition type:
   https://docs.taco.build/for-developers/taco-sdk/references/conditions/cookbook

4. Annotated complex example (read this for deep patterns):
   https://docs.taco.build/for-developers/taco-sdk/references/conditions/discord-tipping-bot-deep-dive

5. Naming & constraint rules (critical):
   https://docs.taco.build/for-developers/taco-sdk/references/conditions/context-variables

---

RULES

- Output a SINGLE JSON object (no prose, no markdown code fence) when I ask for a condition.
- Every field must exist in the schema. Do not invent fields.
- Do not use field names you find in the examples without verifying them in the schema.

CONTEXT VARIABLES
- All custom context variables must start with `:` — e.g. `:userAddress`, `:walletBalance`.
- After the `:`, the name must match /^[a-zA-Z_][a-zA-Z0-9_]*$/ (letters, digits, underscores only).
- No dots, dashes, hyphens, or spaces. `:user-address`, `:user.address`, `:1first` are all INVALID.
- Case-sensitive: `:userAddress` ≠ `:useraddress`.
- Built-in variables you do NOT need to define yourself: `:userAddress` (requester's wallet), `:message` (signed message), `:signature` (signature being verified), `:jwtToken` (JWT being validated), `:signingConditionObject` (UserOperation in threshold signing).

COMPOSITION CONSTRAINTS
- CompoundCondition: max 5 operands, max 2 levels of nesting (a compound can contain a compound, but that inner compound cannot itself contain another compound).
- If you need more than 5 operands, use SequentialCondition instead.
- SequentialCondition: 2–20 variables. Each step binds a `varName` that later steps can reference as `:varName`.
- IfThenElseCondition: standard if-then-else; else branch is optional.

TIPS FOR CLARITY
- Be explicit about the chain ID. Say `"chain": 8453` (Base mainnet), not just "Base". See https://docs.taco.build/reference/contract-addresses
- Name the data source. "Check an NFT balance" is vague. "balanceOf(:userAddress) on contract 0xabc... on Polygon (137)" is unambiguous.
- Specify the comparator. Models default to `==` even when you mean `>=`.
- For sequential conditions, list variables in dependency order.
- For ABI validation, give me the exact function signature, e.g. `transfer(address,uint256)` (no spaces, correct param types).

ITERATION LOOP
- After each condition I produce, you will run the validator (see section below) and paste the output back if there are errors.
- I will fix validation errors and iterate.
- If valid, test end-to-end with the TACo Playground (https://playground.taco.build/) or your application.

---

What I want the condition to enforce:
<describe your access policy in plain English>
```

---

## Naming Rules Cheatsheet

**Context variables start with `:`**

```
✅ Valid:   :userAddress, :accountAge, :nftBalance, :_internal, :v2
❌ Invalid: userAddress, :user-address, :user.address, :1param, :user address
```

**Regex pattern:** `/^:[a-zA-Z_][a-zA-Z0-9_]*$/`

| Rule | Example |
|------|---------|
| Must start with `:` | `:userAddress` |
| Next char is letter or `_` | `:_internal`, `:account` ✓ |
| Then any letters, digits, `_` | `:balance_v2` ✓ |
| No special chars, no spaces | `:user-address` ❌ |

**SequentialCondition twist:** When you *bind* a variable, omit the `:`. When you *reference* it later, use `:`.

```json
{
  "varName": "balance",           // ← No colon when binding
  "condition": { "..." }
}
// Later, reference it:
{ "contextVariable": ":balance" } // ← With colon
```

---

## Constraint Rules at a Glance

| Constraint | Limit |
|-----------|-------|
| CompoundCondition operands | max 5 |
| CompoundCondition nesting depth | max 2 (compound → compound → primitive) |
| SequentialCondition variables | 2–20 |
| Variables in IfThenElseCondition | 1 condition + else branch |
| Operations per variable | up to 5 |
| Max fields in a parameter tuple (ABI) | no limit, but keep <= 10 for readability |

---

## Common Condition Patterns

### Pattern: Time Gate
Allow after a specific timestamp.

```json
{
  "version": "1.0.0",
  "condition": {
    "conditionType": "time",
    "chain": 8453,
    "method": "blocktime",
    "returnValueTest": { "comparator": ">", "value": 1735689600 }
  }
}
```

### Pattern: NFT Ownership
Hold at least one NFT from a collection.

```json
{
  "version": "1.0.0",
  "condition": {
    "conditionType": "contract",
    "chain": 137,
    "contractAddress": "0xYourNFTAddress",
    "standardContractType": "ERC721",
    "method": "balanceOf",
    "parameters": [":userAddress"],
    "returnValueTest": { "comparator": ">", "value": 0 }
  }
}
```

### Pattern: Token Balance (ERC-20)
Hold at least 1000 USDC (6 decimals).

```json
{
  "version": "1.0.0",
  "condition": {
    "conditionType": "contract",
    "chain": 8453,
    "contractAddress": "0xUsdc...",
    "standardContractType": "ERC20",
    "method": "balanceOf",
    "parameters": [":userAddress"],
    "returnValueTest": { "comparator": ">=", "value": 1000000000 }
  }
}
```

### Pattern: AND / OR Logic
Require NFT *and* minimum balance, *or* allowlist entry.

```json
{
  "version": "1.0.0",
  "condition": {
    "conditionType": "compound",
    "operator": "or",
    "operands": [
      {
        "conditionType": "compound",
        "operator": "and",
        "operands": [
          { "conditionType": "contract", "..." },
          { "conditionType": "contract", "..." }
        ]
      },
      { "conditionType": "contract", "..." }
    ]
  }
}
```

### Pattern: Sequential (Derived Value)
Fetch balance, normalise it (divide by decimals), then check it.

```json
{
  "version": "1.0.0",
  "condition": {
    "conditionType": "sequential",
    "conditionVariables": [
      {
        "varName": "balanceWei",
        "condition": {
          "conditionType": "contract",
          "chain": 1,
          "contractAddress": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
          "standardContractType": "ERC20",
          "method": "balanceOf",
          "parameters": [":userAddress"],
          "returnValueTest": { "comparator": ">=", "value": 0 }
        },
        "operations": [{ "operation": "weiToEth" }]
      },
      {
        "varName": "validateBalance",
        "condition": {
          "conditionType": "context-variable",
          "contextVariable": ":balanceWei",
          "returnValueTest": { "comparator": ">=", "value": 1 }
        }
      }
    ]
  }
}
```

---

## Validate & Iterate

### Option 1: TypeScript Validator (Recommended)

If your project has Node.js:

```bash
npm install --save-dev @nucypher/taco tsx
npx tsx scripts/validate-conditions.ts
```

Or download the script directly:
https://docs.taco.build/for-developers/taco-sdk/references/conditions/validating-conditions#the-script

Save it as `scripts/validate-conditions.ts` and adjust the conditions path as needed.

**Output:**
```
✅ Conditions are VALID according to TACo SDK!
```

If invalid, the error message (saved to `validation-error.txt`) tells you exactly what is wrong. Paste it back to the LLM with the context: "Here's the error. The condition is: [paste your JSON]. How do I fix it?"

### Option 2: JSON Schema Validator (Any Language)

```bash
pnpm dlx ajv-cli validate \
  -s https://raw.githubusercontent.com/nucypher/taco-web/signing-epic/packages/taco/schema-docs/condition-schema.json \
  -d conditions.json --strict=false
```

Or use any [JSON Schema validator](https://json-schema.org/implementations.html) in your language of choice (Python `jsonschema`, Go `gojsonschema`, etc.).

### Option 3: Editor Integration (VS Code, Cursor, JetBrains)

At the top of `conditions.json`, add:

```json
{
  "$schema": "https://raw.githubusercontent.com/nucypher/taco-web/signing-epic/packages/taco/schema-docs/condition-schema.json",
  "version": "1.0.0",
  "condition": { ... }
}
```

Your editor will now validate and autocomplete as you type.

---

## Error Mapping

Common validation errors and what they mean:

| Error | Cause | Fix |
|-------|-------|-----|
| `Invalid literal value, expected "and"` | Operator is uppercase or typo | Use lowercase: `"and"`, `"or"`, `"not"` |
| `Invalid literal value, expected "contract"` | Wrong `conditionType` | Check spelling: `"contract"`, not `"contractCondition"` |
| `String must match pattern /^:[a-zA-Z_]...` | Context variable is malformed | Add `:`, remove special chars, start with letter/`_` |
| `Required` on a field you omitted | Field is mandatory per schema | Check schema reference; use `[]` for empty arrays |
| `Array must contain at least 5 element(s)` | CompoundCondition has >5 operands | Limit operands to 5 or split into SequentialCondition |
| `Compound condition nesting depth exceeded` | Compound → Compound → Compound | Max nesting depth is 2; use SequentialCondition for deeper logic |

For more detail: https://docs.taco.build/for-developers/taco-sdk/references/conditions/troubleshooting

---

## Workflow: End-to-End Example

### You write:
```
I want to allow decryption only if the user holds an NFT from my collection on Polygon (0xMyNFT) AND has at least 10 ETH on Ethereum mainnet.
```

### LLM produces:
```json
{
  "version": "1.0.0",
  "condition": {
    "conditionType": "compound",
    "operator": "and",
    "operands": [
      {
        "conditionType": "contract",
        "chain": 137,
        "contractAddress": "0xMyNFT",
        "standardContractType": "ERC721",
        "method": "balanceOf",
        "parameters": [":userAddress"],
        "returnValueTest": { "comparator": ">", "value": 0 }
      },
      {
        "conditionType": "contract",
        "chain": 1,
        "contractAddress": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        "standardContractType": "ERC20",
        "method": "balanceOf",
        "parameters": [":userAddress"],
        "returnValueTest": { "comparator": ">=", "value": 10000000000000000000 }
      }
    ]
  }
}
```

### You validate:
```bash
npx tsx scripts/validate-conditions.ts
```

### Output:
```
✅ Conditions are VALID according to TACo SDK!
```

### You deploy:
Ship it to your application. Use the [TACo Playground](https://playground.taco.build/) to test end-to-end before production.

---

## Asset Links

- **Official LLM Authoring Guide:** https://docs.taco.build/for-developers/taco-sdk/references/conditions/building-with-llms
- **Condition Schema (JSON):** https://raw.githubusercontent.com/nucypher/taco-web/signing-epic/packages/taco/schema-docs/condition-schema.json
- **Schema Reference (readable):** https://github.com/nucypher/taco-web/blob/signing-epic/packages/taco/schema-docs/condition-schemas.md
- **Cookbook (22 examples):** https://docs.taco.build/for-developers/taco-sdk/references/conditions/cookbook
- **Discord Tipping Bot (complex example):** https://docs.taco.build/for-developers/taco-sdk/references/conditions/discord-tipping-bot-deep-dive
- **Validator Script:** https://docs.taco.build/for-developers/taco-sdk/references/conditions/validating-conditions
- **Troubleshooting:** https://docs.taco.build/for-developers/taco-sdk/references/conditions/troubleshooting
- **TACo Playground (testing):** https://playground.taco.build/
- **Context Variables Reference:** https://docs.taco.build/for-developers/taco-sdk/references/conditions/context-variables

---

## Q&A

**Q: Can I test conditions before deploying?**  
A: Yes. Use the [TACo Playground](https://playground.taco.build/) to simulate decryption with your condition and test requesters' data.

**Q: What if the LLM keeps producing invalid conditions?**  
A: Paste the validator error + your condition + the schema reference link into the LLM with: "Here's the error. Fix it and explain why." Most converge in 1–2 more rounds.

**Q: Can I use context variables the LLM doesn't know about?**  
A: Yes. Any context variable (starting with `:`) is valid. You supply its value at decryption time. Tell the LLM: "Use a context variable `:myCustomVar` and I will supply its value at runtime."

**Q: Are there limits on condition complexity?**  
A: CompoundCondition max 5 operands, max 2 nesting depth. SequentialCondition handles 2–20 steps. If you need more: compound → operand1 (SequentialCondition), operand2 (SequentialCondition), etc.

**Q: Can LLMs reliably produce valid conditions?**  
A: Yes, with this workflow. Tests show 1–3 iterations to validity. The validator catches all structural errors; the LLM fixes them in real time.

---

## For Integration Developers

If you are embedding condition authoring into your product (e.g., a UI for end users to set access policies), consider:

1. **Pre-populate the prompt template** with your context (schema link, special variables you provide, etc.).
2. **Automate the validator loop** — call `validate-conditions.ts` in CI/CD on every generated condition.
3. **Show validator errors inline** — when validation fails, surface the error to the user with the error text and a suggestion to use an LLM for fixes.
4. **Cache validated conditions** — store conditions that pass validation to avoid re-validating known-good policies.

---

**Last updated:** 2026-04-10  
**Canonical sources:** Links above point to `signing-epic` branch. Adapt for your deployment target if using a different branch.
