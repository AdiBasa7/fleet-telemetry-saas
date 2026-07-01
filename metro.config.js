const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Block nested node_modules that npm creates due to hoisting conflicts.
// Packages there (undici, @expo/cli internals, etc.) are Node.js-only and
// must never be bundled into the React Native app.
const blockList = config.resolver.blockList
  ? [].concat(config.resolver.blockList)
  : [];

blockList.push(
  new RegExp(
    path.join(__dirname, 'node_modules', 'node_modules').replace(/\\/g, '\\\\') + '.*'
  )
);

config.resolver.blockList = blockList;

module.exports = config;
