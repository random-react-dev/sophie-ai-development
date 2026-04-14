// plugins/withPortraitCompat.js
// Adds PROPERTY_COMPAT_ALLOW_RESTRICTED_RESIZABILITY to AndroidManifest.xml
// This preserves portrait lock on large screens (tablets/foldables) on Android 16+
// Official Google temporary opt-out — valid through API 36 (~2027)
const { withAndroidManifest } = require("expo/config-plugins");

module.exports = function withPortraitCompat(config) {
  return withAndroidManifest(config, (config) => {
    const app = config.modResults.manifest.application[0];
    if (!app["property"]) {
      app["property"] = [];
    }
    app["property"].push({
      $: {
        "android:name":
          "android.window.PROPERTY_COMPAT_ALLOW_RESTRICTED_RESIZABILITY",
        "android:value": "true",
      },
    });
    return config;
  });
};
