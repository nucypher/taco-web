const CopyWebpackPlugin = require("copy-webpack-plugin");
const path = require("path");

module.exports = {
  entry: {
    index: "./index.ts",
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "index.js",
  },
  mode: "development",
  plugins: [new CopyWebpackPlugin({ patterns: ["index.html"] })],
  experiments: {
    asyncWebAssembly: true,
  },
};
