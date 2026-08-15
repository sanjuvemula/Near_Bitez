module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      // Lets `@/...` resolve to src/, matching the tsconfig paths above.
      [
        "module-resolver",
        {
          alias: { "@": "./src" },
          extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
        },
      ],
      // Must stay last — Reanimated's plugin has to run after everything else.
      "react-native-reanimated/plugin",
    ],
  };
};
