import { initUmbral, runUmbral } from '../src/umbral';

describe('umbral', () => {
  it('runs', async () => {
    const umbral = await initUmbral();
    expect(runUmbral(umbral)).toBeTruthy();
  });
});
