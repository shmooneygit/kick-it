import { View, ViewProps, StyleSheet } from 'react-native';
import { Colors, BorderRadius, Spacing } from '@/constants/theme';

interface GlassCardProps extends ViewProps {
  glowColor?: string;
  compact?: boolean;
}

export function GlassCard({ glowColor, compact, style, children, ...props }: GlassCardProps) {
  return (
    <View
      style={[
        styles.card,
        compact && styles.cardCompact,
        glowColor && {
          borderColor: glowColor + '66',
          shadowColor: glowColor,
          shadowOpacity: 0.3,
          shadowRadius: 12,
          elevation: 8,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceGlass,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  cardCompact: {
    padding: Spacing.sm,
  },
});
