import React, { useState, useEffect, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet } from 'react-native';

import LiveFeedScreen from './screens/LiveFeedScreen';
import AlertsScreen from './screens/AlertsScreen';
import ReviewScreen from './screens/ReviewScreen';
import { BACKEND_URL } from './config';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function AlertsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#111' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen name="AlertsList" component={AlertsScreen} options={{ title: 'Olaylar' }} />
      <Stack.Screen name="Review" component={ReviewScreen} options={{ title: 'Olay İncele' }} />
    </Stack.Navigator>
  );
}

export default function App() {
  const [pendingCount, setPendingCount] = useState(0);

  const pollPending = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/incidents/pending`, { signal: AbortSignal.timeout(3000) });
      const data = await res.json();
      setPendingCount(data.count || 0);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    pollPending();
    const interval = setInterval(pollPending, 5000);
    return () => clearInterval(interval);
  }, [pollPending]);

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarStyle: {
            backgroundColor: '#111',
            borderTopColor: '#222',
          },
          tabBarActiveTintColor: '#6a5acd',
          tabBarInactiveTintColor: '#555',
          headerStyle: { backgroundColor: '#111' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' },
          tabBarIcon: ({ focused, color, size }) => {
            if (route.name === 'LiveFeed') {
              return <Ionicons name={focused ? 'videocam' : 'videocam-outline'} size={size} color={color} />;
            }
            if (route.name === 'Alerts') {
              return (
                <View>
                  <Ionicons name={focused ? 'notifications' : 'notifications-outline'} size={size} color={color} />
                  {pendingCount > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{pendingCount > 9 ? '9+' : pendingCount}</Text>
                    </View>
                  )}
                </View>
              );
            }
          },
        })}
      >
        <Tab.Screen
          name="LiveFeed"
          component={LiveFeedScreen}
          options={{ title: 'Canlı Yayın' }}
        />
        <Tab.Screen
          name="Alerts"
          component={AlertsStack}
          options={{ title: 'Olaylar', headerShown: false }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    right: -6,
    top: -3,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
});
