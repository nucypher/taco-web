import { Primitive, z, ZodLiteral } from 'zod';

// Source: https://github.com/colinhacks/zod/issues/831#issuecomment-1063481764
const createUnion = <
  T extends Readonly<[Primitive, Primitive, ...Primitive[]]>,
>(
  values: T,
) => {
  const zodLiterals = values.map((value) => z.literal(value)) as unknown as [
    ZodLiteral<Primitive>,
    ZodLiteral<Primitive>,
    ...ZodLiteral<Primitive>[],
  ];
  return z.union(zodLiterals);
};

function createUnionSchema<T extends readonly Primitive[]>(values: T) {
  if (values.length === 0) {
    return z.never();
  }

  if (values.length === 1) {
    return z.literal(values[0]);
  }

  return createUnion(
    values as unknown as Readonly<[Primitive, Primitive, ...Primitive[]]>,
  );
}

export default createUnionSchema;
