import { theme, colors, typography, spacing, radii } from '@/theme';

describe('Theme Foundation Tokens', () => {
  it('should define core color palette', () => {
    expect(colors.background).toBe('#FBF9F6');
    expect(colors.accent).toBe('#D4C4B0');
    expect(colors.textPrimary).toBe('#2D2D2D');
    expect(colors.textSecondary).toBe('#8A7E72');
    expect(colors.card).toBe('#FFFFFF');
  });

  it('should define proper typography presets', () => {
    expect(typography.presets.hero.fontSize).toBe(32);
    expect(typography.presets.title1.fontSize).toBe(22);
    expect(typography.presets.body.fontSize).toBe(14);
    expect(typography.presets.tag.fontSize).toBe(10);
  });

  it('should export spacing and radii tokens', () => {
    expect(spacing.lg).toBe(16);
    expect(spacing.xxl).toBe(24);
    expect(radii.card).toBe(28);
    expect(radii.cardLarge).toBe(40);
  });
});
