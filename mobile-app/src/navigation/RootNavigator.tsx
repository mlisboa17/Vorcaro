import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MaterialIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { HomeScreen } from '../screens/HomeScreen';
import { LaunchScreen } from '../screens/LaunchScreen';
import { CompanionScreen } from '../screens/CompanionScreen';
import { AlertsScreen } from '../screens/AlertsScreen';
import { ConfigScreen } from '../screens/ConfigScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function HomeStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#1976d2',
        },
        headerTintColor: 'white',
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: 18,
        },
      }}
    >
      <Stack.Screen
        name="HomeScreenMain"
        component={HomeScreen}
        options={{
          title: 'Vorcaro',
        }}
      />
      <Stack.Screen
        name="Launch"
        component={LaunchScreen}
        options={{
          title: 'Novo Lançamento',
        }}
      />
    </Stack.Navigator>
  );
}

function CompanionStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="CompanionScreenMain"
        component={CompanionScreen}
      />
    </Stack.Navigator>
  );
}

function AlertsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#1976d2',
        },
        headerTintColor: 'white',
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: 18,
        },
      }}
    >
      <Stack.Screen
        name="AlertsScreenMain"
        component={AlertsScreen}
        options={{
          title: 'Alertas',
        }}
      />
    </Stack.Navigator>
  );
}

function ConfigStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#1976d2',
        },
        headerTintColor: 'white',
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: 18,
        },
      }}
    >
      <Stack.Screen
        name="ConfigScreenMain"
        component={ConfigScreen}
        options={{
          title: 'Configurações',
        }}
      />
    </Stack.Navigator>
  );
}

export function RootNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = 'home';

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Companion') {
            iconName = focused ? 'chat' : 'chat-outline';
          } else if (route.name === 'Alerts') {
            iconName = focused ? 'bell' : 'bell-outline';
          } else if (route.name === 'Config') {
            iconName = focused ? 'cog' : 'cog-outline';
          }

          return (
            <MaterialIcons
              name={iconName}
              size={size}
              color={color}
            />
          );
        },
        tabBarActiveTintColor: '#1976d2',
        tabBarInactiveTintColor: '#999',
        tabBarLabelStyle: {
          fontSize: 12,
          marginBottom: 4,
        },
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
          backgroundColor: '#fff',
          paddingBottom: 4,
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={{
          title: 'Início',
        }}
      />
      <Tab.Screen
        name="Companion"
        component={CompanionStack}
        options={{
          title: 'Assistente',
        }}
      />
      <Tab.Screen
        name="Alerts"
        component={AlertsStack}
        options={{
          title: 'Alertas',
        }}
      />
      <Tab.Screen
        name="Config"
        component={ConfigStack}
        options={{
          title: 'Config',
        }}
      />
    </Tab.Navigator>
  );
}
