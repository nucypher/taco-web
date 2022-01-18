# `nucypher-ts` in the browser

This example shows is written in TypeScript and shows usage of `nucypher-ts` with React. It takes advantage of experimental async WASM loading in `webpack-5`. See `webpack.config.js` for details:

```
  experiments: {
    asyncWebAssembly: true,
  },
```

## Usage

```bash
yarn install
yarn start
```

Next, go to [http://127.0.0.1:8080/](http://127.0.0.1:8080/) in your browser and look into the JS console.
