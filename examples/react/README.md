# `react-craco` integration example

Shows how to integrate `@nucypher/*` into a React application.

In order to load WASM dependencies of `@nucypher/*`, we override the `react-scripts` configuration with `craco`. For
more details, see the `craco.config.js` file.

## Usage

```bash
pnpm install
pnpm start
```

Next, go to [http://127.0.0.1:3000/](http://127.0.0.1:8080/) in your browser and inspect the UI and the JS console.
