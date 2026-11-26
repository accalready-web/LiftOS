import React from 'react';
import {
  View,
  Text,
  Pressable,
  useWindowDimensions,
  StyleSheet,
  Platform,
  ScrollView,
} from 'react-native';
import { Tabs, usePathname, router } from 'expo-router';
import {
  Dumbbell,
  History,
  Library,
  Settings,
  RefreshCw,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getColors, Layout, Spacing, FontSize, FontWeight } from '@/constants/theme';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { MiniWorkoutBar } from '@/components/layout/MiniWorkoutBar';

// ─── Tab definitions ────────────────────────────────────────────

interface TabDef {
  name: string;
  title: string;
  icon: typeof Dumbbell;
}

const TABS: TabDef[] = [
  { name: 'index', title: 'Workout', icon: Dumbbell },
  { name: 'history', title: 'History', icon: History },
  { name: 'exercises', title: 'Exercises', icon: Library },
  { name: 'settings', title: 'Settings', icon: Settings },
];

// ─── Desktop Sidebar ────────────────────────────────────────────

function SidebarNav() {
  const theme = useSettingsStore((s) => s.theme);
  const colors = getColors(theme);
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const syncStatus = useAuthStore((s) => s.syncStatus);
  const session = useAuthStore((s) => s.session);
  const syncNow = useAuthStore((s) => s.syncNow);

  const syncLabel =
    syncStatus === 'syncing'
      ? 'Syncing...'
      : syncStatus === 'synced'
        ? 'Synced'
        : syncStatus === 'error'
          ? 'Sync Error'
          : session
            ? 'Ready to Sync'
            : 'Offline';

  const syncColor =
    syncStatus === 'synced'
      ? colors.success
      : syncStatus === 'syncing'
        ? colors.primary
        : syncStatus === 'error'
          ? colors.danger
          : colors.textSecondary;

  const isActive = (name: string) => {
    if (name === 'index') return pathname === '/' || pathname === '/index';
    return pathname === `/${name}` || pathname.startsWith(`/${name}/`);
  };

  return (
    <View
      style={[
        sidebarStyles.container,
        {
          width: Layout.sidebarWidth,
          backgroundColor: colors.surface,
          borderRightColor: colors.border,
          paddingTop: insets.top + Spacing.lg,
        },
      ]}
    >
      {/* Logo */}
      <View style={sidebarStyles.logoContainer}>
        <Dumbbell size={24} color={colors.primary} />
        <Text
          style={[
            sidebarStyles.logoText,
            { color: colors.textPrimary },
          ]}
        >
          LiftOS
        </Text>
      </View>

      {/* Nav items */}
      <ScrollView style={sidebarStyles.navList} showsVerticalScrollIndicator={false}>
        {TABS.map((tab) => {
          const active = isActive(tab.name);
          const IconComponent = tab.icon;
          return (
            <Pressable
              key={tab.name}
              onPress={() =>
                router.navigate(
                  tab.name === 'index' ? '/(tabs)/' : (`/(tabs)/${tab.name}` as never),
                )
              }
              style={[
                sidebarStyles.navItem,
                {
                  backgroundColor: active
                    ? `${colors.primary}18`
                    : 'transparent',
                  borderRadius: Layout.radius.md,
                },
              ]}
            >
              <IconComponent
                size={20}
                color={active ? colors.primary : colors.textSecondary}
              />
              <Text
                style={[
                  sidebarStyles.navLabel,
                  {
                    color: active ? colors.primary : colors.textSecondary,
                    fontWeight: active
                      ? FontWeight.semibold
                      : FontWeight.medium,
                  },
                ]}
              >
                {tab.title}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Sync status badge */}
      <Pressable
        onPress={() => {
          if (session && syncStatus !== 'syncing') {
            void syncNow();
          }
        }}
        style={[
          sidebarStyles.syncBadge,
          { borderTopColor: colors.border, paddingBottom: Spacing.lg },
        ]}
      >
        <RefreshCw size={14} color={syncColor} />
        <Text style={[sidebarStyles.syncText, { color: syncColor }]}>
          {syncLabel}
        </Text>
      </Pressable>
    </View>
  );
}

const sidebarStyles = StyleSheet.create({
  container: {
    borderRightWidth: 1,
    justifyContent: 'flex-start',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
    gap: Spacing.sm,
  },
  logoText: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
  },
  navList: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.xs,
    gap: Spacing.md,
  },
  navLabel: {
    fontSize: FontSize.base,
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  syncText: {
    fontSize: FontSize.xs,
  },
});

// ─── Main Layout ────────────────────────────────────────────────

export default function TabsLayout() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= Layout.desktopBreakpoint;
  const theme = useSettingsStore((s) => s.theme);
  const colors = getColors(theme);

  // TODO: wire to useActiveWorkoutStore in Step 2.3
  const isWorkoutActive = false;

  if (isDesktop) {
    // Desktop: sidebar + content area
    return (
      <View style={{ flex: 1, flexDirection: 'row', backgroundColor: colors.background }}>
        <SidebarNav />
        <View style={{ flex: 1 }}>
          <MiniWorkoutBar visible={isWorkoutActive} />
          <Tabs
            screenOptions={{
              headerShown: false,
              tabBarStyle: { display: 'none' }, // hide bottom tabs on desktop
              sceneStyle: { backgroundColor: colors.background },
            }}
          >
            {TABS.map((tab) => (
              <Tabs.Screen
                key={tab.name}
                name={tab.name}
                options={{ title: tab.title }}
              />
            ))}
          </Tabs>
        </View>
      </View>
    );
  }

  // Mobile: bottom tab bar
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: colors.background },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarStyle: {
            backgroundColor: colors.tabBarBackground,
            borderTopColor: colors.tabBarBorder,
            borderTopWidth: 1,
            height: Layout.tabBarHeight,
            paddingBottom: Platform.OS === 'android' ? Spacing.xs : undefined,
          },
          tabBarLabelStyle: {
            fontSize: FontSize.xs,
            fontWeight: FontWeight.medium,
          },
        }}
      >
        {TABS.map((tab) => {
          const IconComponent = tab.icon;
          return (
            <Tabs.Screen
              key={tab.name}
              name={tab.name}
              options={{
                title: tab.title,
                tabBarIcon: ({ color, size }) => (
                  <IconComponent size={size ?? 22} color={color} />
                ),
              }}
            />
          );
        })}
      </Tabs>

      {/* MiniWorkoutBar sits above tab bar */}
      <MiniWorkoutBar visible={isWorkoutActive} />
    </View>
  );
}
