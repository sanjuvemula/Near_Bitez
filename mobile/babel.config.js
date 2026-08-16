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
      // Must stay last. Reanimated 4 moved worklet compilation into
      // react-native-worklets, so the plugin comes from there now —
      // "react-native-reanimated/plugin" no longer exists.
      "react-native-worklets/plugin",
    ],
  };
};
