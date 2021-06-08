import { sum, initUmbral, runUmbral } from 'nucypher-ts';

const runExample = async () => {
  console.assert(sum(2, 2) === 4);
  const umbralPkg = await initUmbral();
  console.assert(runUmbral(umbralPkg));
  console.log('Success!');
};

runExample();
