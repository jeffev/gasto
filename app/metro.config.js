const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Impede o Metro de monitorar pastas de build do Android dentro de node_modules
config.resolver.blockList = [
  /node_modules\/.*\/android\/build\/.*/,
  /android\/build\/.*/,
  /android\/.cxx\/.*/,
];

module.exports = config;
