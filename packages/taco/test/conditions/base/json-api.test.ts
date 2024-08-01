import { describe, expect, it } from 'vitest';

import { jsonPathSchema } from '../../../src/conditions/base/json-api';

describe('JSONPath Validation', () => {
  it('Invalid JSONPath: Incomplete filter expression', () => {
    const invalidPath = '$.store.book[?(@.price < ]';
    const result = jsonPathSchema.safeParse(invalidPath);
    expect(result.success).toBe(false);
    expect(result.error!.errors[0].message).toBe('Invalid JSONPath expression');
  });

  it('Invalid JSONPath: Incorrect use of brackets', () => {
    const invalidPath = '$[store][book]';
    const result = jsonPathSchema.safeParse(invalidPath);
    expect(result.success).toBe(false);
    expect(result.error!.errors[0].message).toBe('Invalid JSONPath expression');
  });

  it('Invalid JSONPath: Unclosed wildcard asterisk', () => {
    const invalidPath = '$.store.book[*';
    const result = jsonPathSchema.safeParse(invalidPath);
    expect(result.success).toBe(false);
    expect(result.error!.errors[0].message).toBe('Invalid JSONPath expression');
  });

  it('Valid JSONPath expression', () => {
    const validPath = '$.store.book[?(@.price < 10)]';
    const result = jsonPathSchema.safeParse(validPath);
    expect(result.success).toBe(true);
  });

  it('Valid JSONPath with correct quotes', () => {
    const validPath = "$.store['book[?(@.price < ]']";
    const result = jsonPathSchema.safeParse(validPath);
    expect(result.success).toBe(true);
  });

  it('Valid JSONPath with correct wildcard', () => {
    const validPath = '$.store.book[*]';
    const result = jsonPathSchema.safeParse(validPath);
    expect(result.success).toBe(true);
  });
});
