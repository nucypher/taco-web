export const initUmbral = async () => await import('umbral-pre');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const runUmbral = (umbral: any) => umbral.SecretKey.random();
