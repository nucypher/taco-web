class Operator {
  static operators: Array<string> = ['and', 'or'];

  operator: string;

  constructor(operator: string) {
    if (!Operator.operators.includes(operator)) {
      throw `"${operator}" is not a valid operator`;
    }
    this.operator = operator;
  }
}

export { Operator };

// class ConditionLingo {
//     // # TODO: 'A Collection of re-encryption conditions evaluated as a compound boolean condition'

//     constructor(conditions: Array<Record<string, unknown>>[]) {

//     }

//     validate (conditions: Array<Record<string, unknown>>[]) {
//         if (!(conditions.length % 2 > 0)){
//             throw ('conditions must be odd length, ever other element being an operator')
//         }
//         conditions.forEach((cn, index) => {
//             if (!(index % 2 > 0))
//         })

//         // if len(lingo) % 2 == 0:
//         //     raise ValueError('conditions must be odd length, ever other element being an operator')
//         // for index, element in enumerate(lingo):
//         //     if (not index % 2) and not (isinstance(element, ReencryptionCondition)):
//         //         raise Exception(f'{index} element must be a condition; Got {type(element)}.')
//         //     elif (index % 2) and (not isinstance(element, Operator)):
//         //         raise Exception(f'{index} element must be an operator; Got {type(element)}.')
//     }

//     def __init__(self, lingo: List[Union[ReencryptionCondition, Operator, Any]]):
//         """
//         The input list must be structured:
//         condition
//         operator
//         condition
//         ...
//         """
//         self._validate(lingo=lingo)
//         self.lingo = lingo

//     @staticmethod
//     def _validate(lingo) -> None:
//         if len(lingo) % 2 == 0:
//             raise ValueError('conditions must be odd length, ever other element being an operator')
//         for index, element in enumerate(lingo):
//             if (not index % 2) and not (isinstance(element, ReencryptionCondition)):
//                 raise Exception(f'{index} element must be a condition; Got {type(element)}.')
//             elif (index % 2) and (not isinstance(element, Operator)):
//                 raise Exception(f'{index} element must be an operator; Got {type(element)}.')
// }
