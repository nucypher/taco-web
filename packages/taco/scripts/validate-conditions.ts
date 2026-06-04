#!/usr/bin/env npx tsx
/**
 * Validates conditions.json against the TACo SDK schemas
 * This helps identify client-side validation errors vs server-side errors
 *
 * Usage: tsx scripts/validate-conditions.ts [path/to/conditions.json]
 */

import * as fs from 'fs';
import * as path from 'path';

import { ConditionExpression } from '../src/conditions/condition-expr';

async function main() {
  const conditionsPath = path.resolve(process.argv[2] ?? 'conditions.json');
  console.log(`Loading conditions from: ${conditionsPath}`);

  const conditionsJson = fs.readFileSync(conditionsPath, 'utf-8');
  const conditionsObj = JSON.parse(conditionsJson);

  console.log('\nConditions loaded:');
  console.log(JSON.stringify(conditionsObj, null, 2));

  console.log('\n--- Validating with TACo SDK ---\n');

  try {
    const expr = ConditionExpression.fromObj(conditionsObj);
    console.log('✅ Conditions are VALID according to TACo SDK!');
    console.log('\nParsed condition type:', expr.condition.conditionType);
  } catch (error) {
    console.error('❌ Conditions are INVALID according to TACo SDK!');
    // Write full error to file
    const errorStr = error instanceof Error
      ? `${error.name}: ${error.message}\n\nStack: ${error.stack}`
      : JSON.stringify(error, null, 2);
    const errorPath = `${conditionsPath}.error.txt`;
    fs.writeFileSync(errorPath, errorStr);
    console.error(`\nFull error written to: ${errorPath}`);
    console.error('\nError message:', error instanceof Error ? error.message : String(error));

    process.exit(1);
  }
}

main().catch(console.error);
