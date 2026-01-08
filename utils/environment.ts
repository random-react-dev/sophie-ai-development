import Constants, { ExecutionEnvironment } from 'expo-constants';

/**
 * Check if the app is running in Expo Go.
 * Expo Go is a sandbox that cannot run custom native modules.
 */
export const isExpoGo = (): boolean => {
    return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
};

/**
 * Check if voice mode features are available.
 * Voice mode requires expo-stream-audio and react-native-audio-api
 * which are native modules not available in Expo Go.
 */
export const isVoiceModeAvailable = (): boolean => {
    return !isExpoGo();
};
