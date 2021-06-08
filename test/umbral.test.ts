// import test from 'ava';

// import { initUmbral, runUmbral } from './umbral';

// test('runUmbral', async (t) => {
//   const umbral = await initUmbral();
//   t.assert(runUmbral(umbral));
// });

// import { initUmbral, runUmbral } from '../src/umbral';

// describe('blah', async () => {
//   const umbral = await initUmbral();
//   expect(runUmbral(umbral));
// });

import { greet } from 'my-project';

describe('blah', () => {
  it('greets', () => {
    expect(greet()).toEqual('Hello, my-project!');
  });
});
