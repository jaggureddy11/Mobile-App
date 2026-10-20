/**
 * Developer-only performance measurement utility for on-device tracking.
 * In production (__DEV__ === false), all methods are no-ops.
 */
class PerfTracker {
  private marks: Map<string, number> = new Map();

  mark(name: string): void {
    if (__DEV__) {
      this.marks.set(name, Date.now());
    }
  }

  measure(name: string, startMark: string): number | null {
    if (!__DEV__) return null;
    const start = this.marks.get(startMark);
    if (!start) return null;
    const duration = Date.now() - start;
    console.log(`[PERF DEV] ${name}: ${duration} ms (since ${startMark})`);
    return duration;
  }

  startTimer(name: string): () => number | null {
    if (!__DEV__) return () => null;
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      console.log(`[PERF DEV] ${name}: ${duration} ms`);
      return duration;
    };
  }
}

export const perfTracker = new PerfTracker();
