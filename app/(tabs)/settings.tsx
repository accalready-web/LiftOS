import { Pressable, StyleSheet, Text, View } from 'react-native';
import { RefreshCw } from 'lucide-react-native';
import { getColors, FontSize, FontWeight, Layout, Spacing } from '@/constants/theme';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useAuthStore } from '@/stores/useAuthStore';

export default function SettingsScreen() {
  const theme = useSettingsStore((s) => s.theme);
  const colors = getColors(theme);

  const session = useAuthStore((s) => s.session);
  const syncStatus = useAuthStore((s) => s.syncStatus);
  const lastSyncedAt = useAuthStore((s) => s.lastSyncedAt);
  const syncError = useAuthStore((s) => s.syncError);
  const syncNow = useAuthStore((s) => s.syncNow);

  const isSyncing = syncStatus === 'syncing';
  const canSync = Boolean(session?.user) && !isSyncing;

  const statusText =
    syncStatus === 'syncing'
      ? 'Syncing...'
      : syncStatus === 'synced'
        ? 'Synced'
        : syncStatus === 'error'
          ? 'Sync Error'
          : session
            ? 'Idle'
            : 'Local-Only (Offline)';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Settings</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Theme, units, sync, and data management
      </Text>

      <View
        style={[
          styles.syncCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: Layout.radius.lg,
          },
        ]}
      >
        <View style={styles.syncInfo}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
            Cloud Sync
          </Text>
          <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
            Status: {statusText}
          </Text>
          <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
            Last synced:{' '}
            {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : 'Never'}
          </Text>
          {syncError ? (
            <Text style={[styles.errorText, { color: colors.danger }]}>
              {syncError}
            </Text>
          ) : null}
        </View>

        <Pressable
          onPress={() => void syncNow()}
          disabled={!canSync}
          style={[
            styles.syncButton,
            {
              backgroundColor: canSync ? colors.primary : colors.surfaceElevated,
              borderRadius: Layout.radius.md,
              opacity: canSync ? 1 : 0.6,
            },
          ]}
        >
          <RefreshCw
            size={16}
            color={canSync ? '#FFFFFF' : colors.textSecondary}
          />
          <Text
            style={[
              styles.syncButtonText,
              { color: canSync ? '#FFFFFF' : colors.textSecondary },
            ]}
          >
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxl,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSize.base,
    marginBottom: Spacing.xxl,
  },
  syncCard: {
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  syncInfo: {
    gap: Spacing.xs,
  },
  cardTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
  },
  cardMeta: {
    fontSize: FontSize.sm,
  },
  errorText: {
    fontSize: FontSize.xs,
    marginTop: Spacing.xs,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  syncButtonText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
  },
});
