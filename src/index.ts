export const sum = (a: number, b: number) => {
  if ('development' === process.env.NODE_ENV) {
    console.log('boop');
  }
  return a + b;
};

import { greet } from 'my-project';

export const runGreet = () => greet();

// export * from './umbral';
