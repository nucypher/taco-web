import {
  sum,
  // initUmbral,
  //  runUmbral
  runGreet,
} from 'nucypher-ts';

const runExample = async () => {
  console.assert(sum(2, 2) === 4);
  // const umbralPkg = await initUmbral();
  // console.assert(runUmbral(umbralPkg));
  console.assert(runGreet());
  console.log('Success!');
};

runExample();
