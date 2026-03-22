export function safeClone<T>(value: T): T {
  try {
    if (typeof structuredClone === 'function') {
      return structuredClone(value);
    }
  } catch {
    // ignore and fall through
  }

  if (Array.isArray(value)) {
    return value.map((item) => safeClone(item)) as T;
  }

  if (value && typeof value === 'object') {
    const output: Record<string, unknown> = {};
    Object.entries(value as Record<string, unknown>).forEach(([key, item]) => {
      output[key] = safeClone(item);
    });
    return output as T;
  }

  return value;
}
