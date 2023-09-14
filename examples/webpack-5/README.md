# `webpack-5` integration example

This example takes advantage of experimental async WASM loading in `webpack-5`. See `webpack.config.js` for details:

```
  experiments: {
    asyncWebAssembly: true,
  },
```

## Usage

```bash
pnpm install
pnpm start
```

Go to [localhost:8080](http://localhost:8080/) in your browser and look in the JS console.
