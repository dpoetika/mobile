import { Platform } from 'react-native';

// Android emülatörde localhost 10.0.2.2'ye yönlendirilir.
// iOS simülatör ve Expo web'de localhost doğrudan çalışır.
// Fiziksel cihaz kullanıyorsanız aşağıdaki satırı IP adresinizle değiştirin:
//   export const BACKEND_URL = "http://192.168.1.X:5000";
export const BACKEND_URL = Platform.OS === 'android'
  ? 'http://10.0.2.2:5000'
  : 'http://localhost:5000';
