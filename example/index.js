import { initUmbral, runUmbral } from 'nucypher-ts';

const runExample = async () => {
  const umbralPkg = await initUmbral();
  console.assert(runUmbral(umbralPkg));
  console.log('Success!');
};

runExample();
