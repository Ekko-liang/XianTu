import type { TextReplaceRule } from '@/types/textRules';

type ParsedRegex = { pattern: string; flags: string } | null;

const MAX_RULES = 30;
const MAX_LINE_LENGTH = 500;
const MAX_REPLACE_RULES = 50;
const MAX_REPLACE_REPLACEMENT_LENGTH = 1500;

let cachedSettingsKey: string | null = null;
let cachedCompiledRules: RegExp[] = [];
let cachedReplaceKey: string | null = null;
let cachedCompiledReplaceRules: Array<{ re: RegExp; replacement: string }> = [];

type SanitizerSettings = {
  customStripRegex: string;
  customStripTags: string;
  customStripText: string;
  replaceRules: TextReplaceRule[];
};

function safeGetSanitizerSettings(): SanitizerSettings {
  try {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return { customStripRegex: '', customStripTags: '', customStripText: '', replaceRules: [] };
    }
    const raw = localStorage.getItem('dad_game_settings');
    if (!raw) return { customStripRegex: '', customStripTags: '', customStripText: '', replaceRules: [] };
    const parsed = JSON.parse(raw);
    return {
      customStripRegex: typeof parsed?.customStripRegex === 'string' ? parsed.customStripRegex : '',
      customStripTags: typeof parsed?.customStripTags === 'string' ? parsed.customStripTags : '',
      customStripText: typeof parsed?.customStripText === 'string' ? parsed.customStripText : '',
      replaceRules: Array.isArray(parsed?.replaceRules) ? (parsed.replaceRules as TextReplaceRule[]) : [],
    };
  } catch {
    return { customStripRegex: '', customStripTags: '', customStripText: '', replaceRules: [] };
  }
}

function ensureGlobalFlag(flags: string): string {
  const normalized = flags || '';
  return normalized.includes('g') ? normalized : `${normalized}g`;
}

function tryParseRegexLine(line: string): ParsedRegex {
  const trimmed = line.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('#') || trimmed.startsWith('//')) return null;

  if (trimmed.startsWith('/') && trimmed.length > 2) {
    const lastSlash = trimmed.lastIndexOf('/');
    if (lastSlash > 0) {
      const pattern = trimmed.slice(1, lastSlash);
      const flags = trimmed.slice(lastSlash + 1);
      if (pattern) return { pattern, flags };
    }
  }

  return { pattern: trimmed, flags: 'g' };
}

function compileCustomStripRules(rawRules: string): RegExp[] {
  const lines = rawRules.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const rules: RegExp[] = [];

  for (const line of lines) {
    if (rules.length >= MAX_RULES) break;
    if (line.length > MAX_LINE_LENGTH) continue;

    const parsed = tryParseRegexLine(line);
    if (!parsed) continue;

    try {
      const flags = ensureGlobalFlag(parsed.flags);
      rules.push(new RegExp(parsed.pattern, flags));
    } catch {
      // ignore invalid regex
    }
  }

  return rules;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function compileTagStripRules(rawTags: string): RegExp[] {
  const lines = rawTags.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const rules: RegExp[] = [];

  for (const line of lines) {
    if (rules.length >= MAX_RULES) break;
    if (line.startsWith('#') || line.startsWith('//')) continue;
    if (line.length > 50) continue;
    if (!/^[a-zA-Z][\w:-]*$/.test(line)) continue;

    const tag = line;
    try {
      rules.push(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi'));
      rules.push(new RegExp(`<\\/?${tag}\\b[^>]*\\/?>`, 'gi'));
    } catch {
      // ignore
    }
  }

  return rules;
}

function compileTextStripRules(rawText: string): RegExp[] {
  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const rules: RegExp[] = [];

  for (const line of lines) {
    if (rules.length >= MAX_RULES) break;
    if (line.startsWith('#') || line.startsWith('//')) continue;
    if (line.length > MAX_LINE_LENGTH) continue;
    try {
      rules.push(new RegExp(escapeRegExp(line), 'g'));
    } catch {
      // ignore
    }
  }

  return rules;
}

function getCompiledCustomStripRules(): RegExp[] {
  const settings = safeGetSanitizerSettings();
  const settingsKey = `${settings.customStripTags}\u0000${settings.customStripText}\u0000${settings.customStripRegex}`;
  if (settingsKey === cachedSettingsKey) return cachedCompiledRules;

  cachedSettingsKey = settingsKey;
  cachedCompiledRules = [
    ...compileTagStripRules(settings.customStripTags),
    ...compileTextStripRules(settings.customStripText),
    ...compileCustomStripRules(settings.customStripRegex)
  ].slice(0, MAX_RULES);
  return cachedCompiledRules;
}

function buildReplaceFlags(rule: TextReplaceRule): string {
  const globalFlag = rule.global === false ? '' : 'g';
  const i = rule.ignoreCase ? 'i' : '';
  const m = rule.mode === 'regex' && rule.multiline ? 'm' : '';
  const s = rule.mode === 'regex' && rule.dotAll ? 's' : '';
  return `${globalFlag}${i}${m}${s}`;
}

function escapeReplacementForText(replacement: string): string {
  return replacement.replace(/\$/g, '$$$$');
}

function compileReplaceRules(rules: TextReplaceRule[]): Array<{ re: RegExp; replacement: string }> {
  const compiled: Array<{ re: RegExp; replacement: string }> = [];
  for (const rule of rules) {
    if (compiled.length >= MAX_REPLACE_RULES) break;
    if (!rule || rule.enabled === false) continue;
    if (typeof rule.pattern !== 'string' || !rule.pattern.trim()) continue;

    const pattern = rule.pattern.length > MAX_LINE_LENGTH ? rule.pattern.slice(0, MAX_LINE_LENGTH) : rule.pattern;
    const replacementRaw = typeof rule.replacement === 'string' ? rule.replacement : '';
    const replacement =
      rule.mode === 'text'
        ? escapeReplacementForText(replacementRaw.slice(0, MAX_REPLACE_REPLACEMENT_LENGTH))
        : replacementRaw.slice(0, MAX_REPLACE_REPLACEMENT_LENGTH);

    try {
      if (rule.mode === 'text') {
        const flags = `${rule.global === false ? '' : 'g'}${rule.ignoreCase ? 'i' : ''}`;
        compiled.push({ re: new RegExp(escapeRegExp(pattern), flags), replacement });
      } else {
        const flags = buildReplaceFlags(rule);
        compiled.push({ re: new RegExp(pattern, flags), replacement });
      }
    } catch {
      // ignore invalid rule
    }
  }
  return compiled;
}

function getCompiledReplaceRules(): Array<{ re: RegExp; replacement: string }> {
  const settings = safeGetSanitizerSettings();
  const settingsKey = JSON.stringify(settings.replaceRules || []);
  if (settingsKey === cachedReplaceKey) return cachedCompiledReplaceRules;

  cachedReplaceKey = settingsKey;
  cachedCompiledReplaceRules = compileReplaceRules(settings.replaceRules || []);
  return cachedCompiledReplaceRules;
}

function sanitizeWithRules(
  text: string,
  customRules: RegExp[],
  replaceRules: Array<{ re: RegExp; replacement: string }>,
): string {
  if (!text) return '';

  let result = text;

  // Built-in: remove thinking/analysis blocks and leftover tags.
  result = result
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
    .replace(/<\/?thinking>/gi, '')
    .replace(/<analysis>[\s\S]*?<\/analysis>/gi, '')
    .replace(/<\/?analysis>/gi, '');

  for (const rule of replaceRules) {
    result = result.replace(rule.re, rule.replacement);
  }

  for (const rule of customRules) {
    result = result.replace(rule, '');
  }

  return result;
}

export function sanitizeAITextForDisplay(text: string): string {
  return sanitizeWithRules(text, getCompiledCustomStripRules(), getCompiledReplaceRules());
}
