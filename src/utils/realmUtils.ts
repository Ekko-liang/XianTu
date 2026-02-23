/**
 * 评级显示工具函数
 * 兼容旧“修仙境界”结构与新“轮回评级”结构。
 */

const STAR_MAP: Record<string, 1 | 2 | 3 | 4 | 5> = {
  初期: 1,
  一星: 1,
  中期: 2,
  二星: 2,
  后期: 3,
  三星: 3,
  圆满: 4,
  四星: 4,
  极境: 5,
  五星: 5,
};

const LEGACY_REALM_TO_RANK: Array<{ matcher: RegExp; rank: 'D' | 'C' | 'B' | 'A' | 'S' | 'SS' | 'SSS' }> = [
  { matcher: /(凡人|候选|新人)/i, rank: 'D' },
  { matcher: /练气|初级轮回者|见习/i, rank: 'C' },
  { matcher: /筑基|中级轮回者|正式/i, rank: 'B' },
  { matcher: /金丹|高级轮回者|资深/i, rank: 'A' },
  { matcher: /元婴|精英轮回者/i, rank: 'S' },
  { matcher: /化神|传说轮回者|队长|领域|裁决/i, rank: 'SS' },
  { matcher: /炼虚|合体|渡劫|超越者|终局/i, rank: 'SSS' },
];

function normalizeRank(value: unknown): 'D' | 'C' | 'B' | 'A' | 'S' | 'SS' | 'SSS' | null {
  if (typeof value !== 'string') return null;
  const raw = value.trim();
  const text = raw.toUpperCase();
  if (!text) return null;

  if (['D', 'C', 'B', 'A', 'S', 'SS', 'SSS'].includes(text)) {
    return text as 'D' | 'C' | 'B' | 'A' | 'S' | 'SS' | 'SSS';
  }

  const gradeMatch = raw.match(/(SSS|SS|D|C|B|A|S)\s*级?/i);
  if (gradeMatch) {
    return gradeMatch[1].toUpperCase() as 'D' | 'C' | 'B' | 'A' | 'S' | 'SS' | 'SSS';
  }

  for (const item of LEGACY_REALM_TO_RANK) {
    if (item.matcher.test(value)) return item.rank;
  }
  return null;
}

function normalizeStar(value: unknown): 1 | 2 | 3 | 4 | 5 {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const n = Math.floor(value);
    return (Math.max(1, Math.min(5, n)) as 1 | 2 | 3 | 4 | 5);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (STAR_MAP[trimmed]) return STAR_MAP[trimmed];
    const starGlyphCount = (trimmed.match(/★/g) || []).length;
    if (starGlyphCount > 0) return Math.max(1, Math.min(5, starGlyphCount)) as 1 | 2 | 3 | 4 | 5;
    if (trimmed.includes('一星')) return 1;
    if (trimmed.includes('二星')) return 2;
    if (trimmed.includes('三星')) return 3;
    if (trimmed.includes('四星')) return 4;
    if (trimmed.includes('五星')) return 5;
    const match = trimmed.match(/([1-5])/);
    if (match) return Number(match[1]) as 1 | 2 | 3 | 4 | 5;
  }

  return 1;
}

function renderStar(star: 1 | 2 | 3 | 4 | 5): string {
  return `${'★'.repeat(star)}${'☆'.repeat(5 - star)}`;
}

/**
 * 格式化评级显示文本。
 *
 * 支持输入：
 * - `"D"` / `"SS"`
 * - 旧境界字符串（如“练气”“金丹后期”）
 * - 对象结构（`{ level, star }` 或 `{ 名称, 阶段 }`）
 */
export function formatRealmWithStage(realm: any): string {
  if (!realm) return 'D级★☆☆☆☆';

  if (typeof realm === 'string') {
    const rank = normalizeRank(realm);
    if (rank) return `${rank}级★☆☆☆☆`;
    return realm;
  }

  const rank = normalizeRank(realm.level || realm.rank || realm.阶段 || realm.名称 || realm.name || realm.realm);
  const star = normalizeStar(realm.star ?? realm.星级 ?? realm.stage ?? realm.阶段);

  if (rank) {
    return `${rank}级${renderStar(star)}`;
  }

  const name = String(realm.名称 || realm.name || '未评级').trim();
  const stage = String(realm.阶段 || realm.stage || '').trim();
  return stage ? `${name}·${stage}` : name;
}
