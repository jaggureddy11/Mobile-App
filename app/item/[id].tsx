import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Linking,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  ExternalLink,
  Clock,
  Calendar,
  CheckCircle,
  Link2,
  PlayCircle,
  FileText,
  CheckSquare,
  Compass,
  Globe,
  Tag as TagIcon,
  Folder,
} from 'lucide-react-native';
import { colors, typography, spacing, radii, shadows } from '@/theme';
import { useItemsStore } from '@/domain/useItemsStore';
import { useCollectionsStore } from '@/domain/useCollectionsStore';
import { ItemType } from '@/domain/types';

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { items, doItem, laterItem, letGoItem } = useItemsStore();
  const { collections } = useCollectionsStore();
  const item = items.find((i) => i.id === id);
  const collection = item?.collection_id
    ? collections.find((c) => c.id === item.collection_id)
    : null;

  if (!item) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Item not found</Text>
          <TouchableOpacity
            style={styles.backHomeBtn}
            onPress={() => router.back()}
          >
            <Text style={styles.backHomeBtnText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const renderTypeIcon = (type: ItemType) => {
    switch (type) {
      case 'reel':
        return <PlayCircle size={22} color={colors.accent} />;
      case 'task':
        return <CheckSquare size={22} color={colors.accent} />;
      case 'activity':
        return <Compass size={22} color={colors.accent} />;
      case 'text':
        return <FileText size={22} color={colors.accent} />;
      case 'link':
      default:
        return <Link2 size={22} color={colors.accent} />;
    }
  };

  const formattedDate = new Date(item.created_at).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

  const handleDoIt = async () => {
    if (item.url) {
      Linking.openURL(item.url).catch((err) =>
        console.warn('Could not open URL:', err)
      );
    }
    await doItem(item.id);
    router.back();
  };

  const handleLater = async () => {
    await laterItem(item.id);
    router.back();
  };

  const handleLetItGo = async () => {
    await letGoItem(item.id);
    router.back();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <ArrowLeft size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <View style={styles.headerTitles}>
            <Text style={styles.headerCategory}>DETAILS</Text>
            <Text style={styles.headerTitle}>Taking a Moment</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Preview Card / Image */}
          {item.image_url ? (
            <View style={styles.heroImageContainer}>
              <Image source={{ uri: item.image_url }} style={styles.heroImage} resizeMode="cover" />
              <View style={styles.heroOverlayBadgeRow}>
                {item.site_name && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.site_name.toUpperCase()}</Text>
                  </View>
                )}
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.type.toUpperCase()}</Text>
                </View>
                {item.status === 'done' && (
                  <View style={[styles.badge, styles.badgeDone]}>
                    <Text style={[styles.badgeText, styles.badgeTextDone]}>DONE</Text>
                  </View>
                )}
              </View>
            </View>
          ) : (
            <View style={styles.previewCard}>
              <View style={styles.previewIconBox}>
                {renderTypeIcon(item.type)}
              </View>
              <View style={styles.badgeRow}>
                {item.site_name && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.site_name.toUpperCase()}</Text>
                  </View>
                )}
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.type.toUpperCase()}</Text>
                </View>
                {item.status === 'done' ? (
                  <View style={[styles.badge, styles.badgeDone]}>
                    <Text style={[styles.badgeText, styles.badgeTextDone]}>
                      DONE
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          )}

          {/* Collection Chip if present */}
          {collection && (
            <View style={styles.collectionBadge}>
              <Folder size={13} color={colors.accent} />
              <Text style={styles.collectionBadgeText}>{collection.name}</Text>
            </View>
          )}

          {/* Title & Note */}
          <Text style={styles.itemTitle}>{item.title}</Text>
          {item.note ? (
            <View style={styles.noteBox}>
              <Text style={styles.noteText}>"{item.note}"</Text>
            </View>
          ) : null}

          {/* Tags if present */}
          {item.tags && item.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {item.tags.map((t) => (
                <View key={t} style={styles.detailTagChip}>
                  <Text style={styles.detailTagText}>#{t}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Metadata Grid */}
          <View style={styles.metaGrid}>
            <View style={styles.metaCard}>
              <Clock size={16} color={colors.accent} style={styles.metaIcon} />
              <Text style={styles.metaLabel}>DURATION</Text>
              <Text style={styles.metaValue}>{item.minutes} Minutes</Text>
            </View>
            <View style={styles.metaCard}>
              <Calendar size={16} color={colors.accent} style={styles.metaIcon} />
              <Text style={styles.metaLabel}>SAVED</Text>
              <Text style={styles.metaValue}>{formattedDate}</Text>
            </View>
          </View>

          {/* Web URL Link */}
          {item.url ? (
            <TouchableOpacity
              style={styles.urlButton}
              onPress={() => Linking.openURL(item.url!)}
              activeOpacity={0.8}
            >
              <ExternalLink size={18} color={colors.textPrimary} />
              <Text style={styles.urlButtonText} numberOfLines={1}>
                {item.url}
              </Text>
            </TouchableOpacity>
          ) : null}

          {/* Action CTAs */}
          {item.status === 'pending' ? (
            <View style={styles.actionsGroup}>
              <TouchableOpacity
                style={styles.doItButton}
                onPress={handleDoIt}
                activeOpacity={0.85}
              >
                <Text style={styles.doItButtonText}>Start this now</Text>
              </TouchableOpacity>

              <View style={styles.secondaryActions}>
                <TouchableOpacity
                  style={styles.laterButton}
                  onPress={handleLater}
                  activeOpacity={0.85}
                >
                  <Text style={styles.laterButtonText}>Keep for later</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.letGoButton}
                  onPress={handleLetItGo}
                  activeOpacity={0.85}
                >
                  <Text style={styles.letGoButtonText}>Let it go</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.completedNotice}>
              <CheckCircle size={20} color={colors.accent} />
              <Text style={styles.completedNoticeText}>
                You already breathed through this activity.
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212, 196, 176, 0.2)',
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: 'rgba(212, 196, 176, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.soft,
  },
  headerTitles: {
    alignItems: 'flex-end',
  },
  headerCategory: {
    ...typography.presets.tag,
    color: colors.accent,
    letterSpacing: 1.5,
  },
  headerTitle: {
    ...typography.presets.title2,
    color: colors.textPrimary,
  },
  headerSpacer: {
    width: 42,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.xxl,
    paddingBottom: 60,
  },
  previewCard: {
    height: 180,
    backgroundColor: colors.card,
    borderRadius: radii.cardLarge,
    borderWidth: 1,
    borderColor: 'rgba(212, 196, 176, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxl,
    position: 'relative',
    ...shadows.card,
  },
  heroImageContainer: {
    height: 220,
    borderRadius: radii.cardLarge,
    overflow: 'hidden',
    marginBottom: spacing.xxl,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: 'rgba(212, 196, 176, 0.25)',
    position: 'relative',
    ...shadows.card,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlayBadgeRow: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.lg,
    flexDirection: 'row',
    gap: spacing.xs,
  },
  collectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(212, 196, 176, 0.25)',
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radii.pill,
    marginBottom: spacing.sm,
  },
  collectionBadgeText: {
    ...typography.presets.tag,
    color: colors.accent,
    fontWeight: '700',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: spacing.lg,
  },
  detailTagChip: {
    backgroundColor: 'rgba(212, 196, 176, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  detailTagText: {
    ...typography.presets.caption,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  previewIconBox: {
    width: 64,
    height: 64,
    borderRadius: 24,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeRow: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.lg,
    flexDirection: 'row',
    gap: spacing.xs,
  },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(212, 196, 176, 0.25)',
  },
  badgeDone: {
    backgroundColor: colors.textPrimary,
  },
  badgeText: {
    ...typography.presets.tag,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  badgeTextDone: {
    color: colors.background,
  },
  itemTitle: {
    ...typography.presets.hero,
    fontSize: 26,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  noteBox: {
    padding: spacing.lg,
    backgroundColor: 'rgba(212, 196, 176, 0.15)',
    borderRadius: radii.xl,
    marginBottom: spacing.xxl,
    borderWidth: 1,
    borderColor: 'rgba(212, 196, 176, 0.2)',
  },
  noteText: {
    ...typography.presets.quote,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  metaGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xxl,
  },
  metaCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radii.card,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(212, 196, 176, 0.2)',
  },
  metaIcon: {
    marginBottom: spacing.xs,
  },
  metaLabel: {
    ...typography.presets.tag,
    color: colors.accent,
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  metaValue: {
    ...typography.presets.title2,
    color: colors.textPrimary,
  },
  urlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    padding: spacing.lg,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: 'rgba(212, 196, 176, 0.3)',
    marginBottom: spacing.xxxl,
  },
  urlButtonText: {
    ...typography.presets.caption,
    color: colors.textPrimary,
    fontWeight: '600',
    flex: 1,
  },
  actionsGroup: {
    gap: spacing.md,
  },
  doItButton: {
    height: 60,
    borderRadius: radii.xl,
    backgroundColor: colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.soft,
  },
  doItButtonText: {
    ...typography.presets.button,
    color: colors.background,
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  laterButton: {
    flex: 1,
    height: 54,
    borderRadius: radii.xl,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: 'rgba(212, 196, 176, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  laterButtonText: {
    ...typography.presets.caption,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  letGoButton: {
    flex: 1,
    height: 54,
    borderRadius: radii.xl,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: 'rgba(212, 196, 176, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  letGoButtonText: {
    ...typography.presets.caption,
    fontWeight: '700',
    color: colors.accent,
  },
  completedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
    backgroundColor: colors.card,
    borderRadius: radii.xl,
  },
  completedNoticeText: {
    ...typography.presets.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  emptyText: {
    ...typography.presets.title1,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  backHomeBtn: {
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.textPrimary,
  },
  backHomeBtnText: {
    ...typography.presets.button,
    color: colors.background,
  },
});
