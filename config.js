import { Platform } from 'react-native';

// Fiziksel cihaz (Expo Go QR) için:
//   1. Bilgisayarda PowerShell açın ve çalıştırın: ipconfig
//   2. "Wireless LAN adapter Wi-Fi" altındaki IPv4 adresini bulun (192.168.x.x gibi)
//   3. Aşağıdaki WIFI_IP değişkenini o adresle değiştirin
//   4. Hem telefon hem bilgisayar AYNI WiFi ağında olmalı

const WIFI_IP = "172.23.236.250";

// Android emülatör için 10.0.2.2, fiziksel cihaz için WiFi IP kullanılır
export const BACKEND_URL = `http://${WIFI_IP}:5000`;
