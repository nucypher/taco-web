export class Operator {
  static readonly LOGICAL_OPERATORS: ReadonlyArray<string> = ['and', 'or'];
  static readonly AND = new Operator('and');
  static readonly OR = new Operator('or');

  public constructor(public readonly operator: string) {
    if (!Operator.LOGICAL_OPERATORS.includes(operator)) {
      throw `"${operator}" must be one of [${Operator.LOGICAL_OPERATORS.join(
        ', '
      )}]`;
    }
    this.operator = operator;
  }

  toObj() {
    return { operator: this.operator };
  }

  static fromObj(obj: Record<string, string>) {
    return new Operator(obj.operator);
  }
}
