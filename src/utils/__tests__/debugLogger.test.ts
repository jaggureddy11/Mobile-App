import { debugLogger } from '../debugLogger';

describe('debugLogger', () => {
  beforeEach(() => {
    debugLogger.clear();
  });

  it('records error name, screen, and timestamp without sensitive data', () => {
    const err = new TypeError('Cannot read property foo of undefined at https://example.com/secret');
    debugLogger.logError('TodayScreen', err);

    const logs = debugLogger.getLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].screen).toBe('TodayScreen');
    expect(logs[0].error_name).toBe('TypeError');
    expect(logs[0].timestamp).toBeDefined();
    // Verify no URL or message content leaked
    expect(logs[0].error_name).not.toContain('https://');
    expect(logs[0].error_name).not.toContain('secret');
  });

  it('caps entries at 50', () => {
    for (let i = 0; i < 65; i++) {
      debugLogger.logError(`Screen_${i}`, new Error(`Fail ${i}`));
    }
    const logs = debugLogger.getLogs();
    expect(logs).toHaveLength(50);
    expect(logs[0].screen).toBe('Screen_15');
    expect(logs[49].screen).toBe('Screen_64');
  });

  it('formats debug info as JSON string', () => {
    debugLogger.logError('SettingsScreen', new RangeError('Index out of bounds'));
    const formatted = debugLogger.formatDebugInfo();
    const parsed = JSON.parse(formatted);
    expect(parsed.app).toBe('Re:Mind');
    expect(parsed.errors).toHaveLength(1);
    expect(parsed.errors[0].error_name).toBe('RangeError');
  });
});
