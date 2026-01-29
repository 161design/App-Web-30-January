import Constants from 'expo-constants';

// Get backend URL from multiple sources for reliability
export const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 
                          Constants.expoConfig?.extra?.backendUrl || 
                          'https://buildtrack-app-3.preview.emergentagent.com';

console.log('API Config - Backend URL:', BACKEND_URL);
