import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { X } from 'lucide-react-native';

import {
  FontSize,
  FontWeight,
  getColors,
  Layout,
  Spacing,
} from '@/constants/theme';
import { useSettingsStore } from '@/stores/useSettingsStore';

interface FolderModalProps {
  visible: boolean;
  initialName?: string;
  title: string;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
}

export function FolderModal({
  visible,
  initialName = '',
  title,
  onClose,
  onSave,
}: FolderModalProps) {
  const theme = useSettingsStore((s) => s.theme);
  const colors = getColors(theme);

  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setName(initialName);
      setError(null);
      setIsSaving(false);
    }
  }, [visible, initialName]);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Please enter a folder name.');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await onSave(name.trim());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save folder');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: Layout.radius.lg,
            },
          ]}
        >
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {title}
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.body}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Folder Name
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Push / Pull / Legs"
              placeholderTextColor={colors.textSecondary}
              autoFocus
              style={[
                styles.input,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  color: colors.textPrimary,
                  borderRadius: Layout.radius.md,
                },
              ]}
            />
            {error ? (
              <Text style={[styles.errorText, { color: colors.danger }]}>
                {error}
              </Text>
            ) : null}
          </View>

          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <Pressable
              onPress={onClose}
              style={[
                styles.btn,
                {
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderRadius: Layout.radius.md,
                },
              ]}
            >
              <Text style={[styles.btnText, { color: colors.textPrimary }]}>
                Cancel
              </Text>
            </Pressable>
            <Pressable
              onPress={() => void handleSave()}
              disabled={isSaving}
              style={[
                styles.btn,
                {
                  backgroundColor: colors.primary,
                  borderRadius: Layout.radius.md,
                  opacity: isSaving ? 0.6 : 1,
                },
              ]}
            >
              <Text style={[styles.btnText, { color: '#FFFFFF' }]}>
                {isSaving ? 'Saving...' : 'Save'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  body: {
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  label: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  input: {
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    height: 44,
    fontSize: FontSize.base,
  },
  errorText: {
    fontSize: FontSize.xs,
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
  btn: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
  },
});
