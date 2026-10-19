import React from 'react';
import { Tabs, useRouter } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { NavigationFooter, TabKey } from '@/components';
import { colors } from '@/theme';

export default function TabsLayout() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: 'none' }, // We use our custom NavigationFooter
        }}
        tabBar={(props) => {
          const routeName = props.state.routes[props.state.index].name;
          const activeTab: TabKey =
            routeName === 'saved'
              ? 'saved'
              : routeName === 'settings'
              ? 'settings'
              : 'today';

          return (
            <NavigationFooter
              activeTab={activeTab}
              onTabPress={(tab) => {
                if (tab === 'today') {
                  router.replace('/(tabs)/today');
                } else if (tab === 'saved') {
                  router.replace('/(tabs)/saved');
                } else if (tab === 'settings') {
                  router.replace('/(tabs)/settings');
                }
              }}
              onAddPress={() => {
                router.push('/add');
              }}
            />
          );
        }}
      >
        <Tabs.Screen name="today" options={{ title: 'Today' }} />
        <Tabs.Screen name="saved" options={{ title: 'Saved' }} />
        <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
