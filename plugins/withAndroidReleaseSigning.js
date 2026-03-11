const { withAppBuildGradle } = require("expo/config-plugins");

/**
 * Expo config plugin that injects release signing configuration into
 * android/app/build.gradle during `expo prebuild`.
 *
 * Credentials are read from ~/.gradle/gradle.properties so they stay
 * out of the repo. Expected properties:
 *
 *   SOPHIE_UPLOAD_STORE_FILE=sophie-upload-key.keystore
 *   SOPHIE_UPLOAD_KEY_ALIAS=sophie-upload-key
 *   SOPHIE_UPLOAD_STORE_PASSWORD=<password>
 *   SOPHIE_UPLOAD_KEY_PASSWORD=<password>
 */
const withAndroidReleaseSigning = (config) => {
  return withAppBuildGradle(config, (config) => {
    const buildGradle = config.modResults.contents;

    // Only inject once
    if (buildGradle.includes("signingConfigs.release")) {
      return config;
    }

    // 1. Add a release signingConfig block inside the existing signingConfigs { }
    const signingConfigBlock = `
        release {
            if (project.hasProperty('SOPHIE_UPLOAD_STORE_FILE')) {
                storeFile file(SOPHIE_UPLOAD_STORE_FILE)
                storePassword SOPHIE_UPLOAD_STORE_PASSWORD
                keyAlias SOPHIE_UPLOAD_KEY_ALIAS
                keyPassword SOPHIE_UPLOAD_KEY_PASSWORD
            }
        }`;

    config.modResults.contents = buildGradle.replace(
      /signingConfigs\s*\{/,
      `signingConfigs {\n${signingConfigBlock}`
    );

    // 2. Change the release buildType to use signingConfigs.release
    //    Match specifically inside "release {" block — [^}]*? won't cross block boundaries
    config.modResults.contents = config.modResults.contents.replace(
      /(release\s*\{[^}]*?signingConfig\s+)signingConfigs\.debug/,
      "$1signingConfigs.release"
    );

    return config;
  });
};

module.exports = withAndroidReleaseSigning;
