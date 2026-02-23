import type { InnateAttributes, Item, Equipment, SaveData } from '@/types/game';
import type { Talent } from '../types/index';
import { LOCAL_TALENTS } from '../data/creationData';

const CHINESE_TO_ENGLISH_MAP: Record<string, string> = {
  根骨: 'root_bone',
  灵性: 'spirituality',
  悟性: 'comprehension',
  气运: 'fortune',
  魅力: 'charm',
  心性: 'temperament',
};

const CHINESE_TO_INFINITE_MAP: Record<string, string> = {
  根骨: 'strength',
  灵性: 'perception',
  悟性: 'intelligence',
  气运: 'luck',
  魅力: 'charisma',
  心性: 'willpower',
};

const TARGET_TO_LEGACY_MAP: Record<string, keyof InnateAttributes> = {
  根骨: '根骨',
  力量: '根骨',
  STR: '根骨',
  CON: '根骨',
  strength: '根骨',
  root_bone: '根骨',

  灵性: '灵性',
  感知: '灵性',
  敏捷: '灵性',
  DEX: '灵性',
  PER: '灵性',
  spirituality: '灵性',
  perception: '灵性',

  悟性: '悟性',
  智力: '悟性',
  INT: '悟性',
  SPI: '悟性',
  comprehension: '悟性',
  intelligence: '悟性',

  气运: '气运',
  幸运: '气运',
  LUK: '气运',
  fortune: '气运',
  luck: '气运',

  魅力: '魅力',
  CHA: '魅力',
  charm: '魅力',
  charisma: '魅力',

  心性: '心性',
  意志: '心性',
  WIL: '心性',
  temperament: '心性',
  willpower: '心性',
};

function emptyLegacyAttributes(): InnateAttributes {
  return {
    根骨: 0,
    灵性: 0,
    悟性: 0,
    气运: 0,
    魅力: 0,
    心性: 0,
  };
}

function toFiniteNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function resolveLegacyAttrKey(raw: unknown): keyof InnateAttributes | null {
  if (typeof raw !== 'string') return null;
  const key = raw.trim();
  if (!key) return null;
  return TARGET_TO_LEGACY_MAP[key] || TARGET_TO_LEGACY_MAP[key.toUpperCase()] || null;
}

function addToLegacyAttributes(
  target: InnateAttributes,
  source: Partial<Record<keyof InnateAttributes, number>>,
): InnateAttributes {
  for (const key of Object.keys(target) as Array<keyof InnateAttributes>) {
    target[key] += toFiniteNumber(source[key]);
  }
  return target;
}

function applyBonusObject(target: InnateAttributes, bonusObject: unknown): void {
  if (!bonusObject || typeof bonusObject !== 'object') return;

  for (const [rawKey, rawValue] of Object.entries(bonusObject as Record<string, unknown>)) {
    const legacyKey = resolveLegacyAttrKey(rawKey);
    if (!legacyKey) continue;
    target[legacyKey] += toFiniteNumber(rawValue);
  }
}

function getInventoryFromSave(saveData: SaveData): SaveData['背包'] | null {
  const root = saveData as any;
  return root?.轮回者?.背包 ?? root?.角色?.背包 ?? root?.背包 ?? null;
}

function getEquipmentFromSave(saveData: SaveData): Equipment | null {
  const root = saveData as any;
  return root?.轮回者?.装备 ?? root?.角色?.装备 ?? root?.装备 ?? null;
}

export function calculateEquipmentBonuses(
  equipment: Equipment | null | undefined,
  inventory: SaveData['背包'] | null | undefined,
): InnateAttributes {
  const bonuses = emptyLegacyAttributes();
  if (!equipment || !inventory?.物品 || typeof inventory.物品 !== 'object') return bonuses;

  for (const itemId of Object.values(equipment)) {
    if (!itemId || typeof itemId !== 'string') continue;
    const item = (inventory.物品 as Record<string, Item>)[itemId];
    if (!item || typeof item !== 'object') continue;

    const rawEquipBonus = (item as any).装备增幅;
    if (rawEquipBonus && typeof rawEquipBonus === 'object') {
      applyBonusObject(bonuses, (rawEquipBonus as any).后天六司);
      applyBonusObject(bonuses, rawEquipBonus);
    }

    const rawAttributeBonus = (item as any).属性加成 || (item as any).abilityBonus;
    applyBonusObject(bonuses, rawAttributeBonus);
  }

  return bonuses;
}

function resolveTalentListFromSave(saveData: SaveData): any[] {
  const root = saveData as any;
  const list = root?.轮回者?.身份?.天赋 ?? root?.角色?.身份?.天赋 ?? root?.角色?.天赋 ?? [];
  return Array.isArray(list) ? list : [];
}

function buildTalentCatalog(): Talent[] {
  const unique = new Map<string, Talent>();
  for (const talent of LOCAL_TALENTS) {
    if (talent?.name) unique.set(talent.name, talent as Talent);
  }
  return [...unique.values()];
}

export function calculateTalentBonuses(talents: Talent[]): InnateAttributes {
  const bonuses = emptyLegacyAttributes();

  for (const talent of talents || []) {
    const effects = Array.isArray(talent?.effects) ? talent.effects : [];
    for (const effect of effects) {
      if (!effect || typeof effect !== 'object') continue;

      const anyEffect = effect as any;
      if (anyEffect.类型 === '后天六司') {
        const key = resolveLegacyAttrKey(anyEffect.目标);
        if (key) bonuses[key] += toFiniteNumber(anyEffect.数值);
        continue;
      }

      if (anyEffect.type === 'ATTRIBUTE_MODIFIER') {
        const key = resolveLegacyAttrKey(anyEffect.target);
        if (key) bonuses[key] += toFiniteNumber(anyEffect.value);
        continue;
      }

      const fallbackKey = resolveLegacyAttrKey(anyEffect.目标 ?? anyEffect.target ?? anyEffect.attribute);
      const fallbackValue = toFiniteNumber(anyEffect.数值 ?? anyEffect.value ?? anyEffect.amount);
      if (fallbackKey && fallbackValue) bonuses[fallbackKey] += fallbackValue;
    }
  }

  return bonuses;
}

export function calculateTalentBonusesFromCharacter(saveData: SaveData): InnateAttributes {
  const selectedTalents = resolveTalentListFromSave(saveData);
  const catalog = buildTalentCatalog();

  const normalizedTalents: Talent[] = [];
  for (const talent of selectedTalents) {
    if (typeof talent === 'string') {
      const predefined = catalog.find((item) => item.name === talent);
      if (predefined) normalizedTalents.push(predefined);
      continue;
    }

    if (!talent || typeof talent !== 'object') continue;

    const name = String((talent as any).名称 ?? (talent as any).name ?? '').trim();
    const predefined = catalog.find((item) => item.name === name);
    if (predefined) {
      normalizedTalents.push(predefined);
      continue;
    }

    normalizedTalents.push({
      id: Number((talent as any).id ?? Date.now()),
      name: name || '未知能力',
      description: String((talent as any).描述 ?? (talent as any).description ?? ''),
      talent_cost: Number((talent as any).talent_cost ?? 0),
      rarity: Number((talent as any).rarity ?? 1),
      effects: Array.isArray((talent as any).effects) ? (talent as any).effects : [],
    });
  }

  return calculateTalentBonuses(normalizedTalents);
}

export function calculateTechniqueBonuses(saveData: SaveData): InnateAttributes {
  const bonuses = emptyLegacyAttributes();
  const inventory = getInventoryFromSave(saveData);
  const items = (inventory?.物品 ?? {}) as Record<string, Item>;

  for (const item of Object.values(items)) {
    if (!item || typeof item !== 'object') continue;
    const type = String((item as any).类型 ?? '');
    const isTechnique = type === '功法' || type === '能力芯片' || type === '能力';
    const equipped = Boolean((item as any).已装备 || (item as any).修炼中);
    if (!isTechnique || !equipped) continue;

    applyBonusObject(bonuses, (item as any).功法效果?.属性加成);
    applyBonusObject(bonuses, (item as any).能力效果?.属性加成);
    applyBonusObject(bonuses, (item as any).属性加成);
  }

  return bonuses;
}

export function calculateFinalAttributes(
  innateAttributes: InnateAttributes,
  saveData: SaveData,
): {
  先天六司: InnateAttributes;
  后天六司: InnateAttributes;
  最终六司: InnateAttributes;
  先天六维: Record<string, number>;
  后天六维: Record<string, number>;
  最终六维: Record<string, number>;
} {
  const root = saveData as any;
  const identity = root?.轮回者?.身份 ?? root?.角色?.身份 ?? root?.角色 ?? {};
  const normalizedInnate = (() => {
    const hasLegacyValue = Object.values(innateAttributes || {}).some((value) => toFiniteNumber(value) > 0);
    if (hasLegacyValue) return { ...innateAttributes };

    const reincarnatorAttrs = root?.轮回者?.attributes;
    if (reincarnatorAttrs && typeof reincarnatorAttrs === 'object') {
      return convertFromInfiniteAttributes(reincarnatorAttrs as Record<string, number>);
    }
    return { ...innateAttributes };
  })();

  const storedAcquired = {
    ...emptyLegacyAttributes(),
    ...(identity?.后天六司 || {}),
  } as InnateAttributes;

  const equipmentBonuses = calculateEquipmentBonuses(getEquipmentFromSave(saveData), getInventoryFromSave(saveData));
  const talentBonuses = calculateTalentBonusesFromCharacter(saveData);
  const techniqueBonuses = calculateTechniqueBonuses(saveData);

  const acquired = emptyLegacyAttributes();
  addToLegacyAttributes(acquired, storedAcquired);
  addToLegacyAttributes(acquired, equipmentBonuses);
  addToLegacyAttributes(acquired, talentBonuses);
  addToLegacyAttributes(acquired, techniqueBonuses);

  const finalAttrs = emptyLegacyAttributes();
  for (const key of Object.keys(finalAttrs) as Array<keyof InnateAttributes>) {
    finalAttrs[key] = toFiniteNumber(normalizedInnate[key]) + toFiniteNumber(acquired[key]);
  }

  return {
    先天六司: { ...normalizedInnate },
    后天六司: acquired,
    最终六司: finalAttrs,
    先天六维: convertToInfiniteAttributes(normalizedInnate),
    后天六维: convertToInfiniteAttributes(acquired),
    最终六维: convertToInfiniteAttributes(finalAttrs),
  };
}

export function convertToEnglishAttributes(chineseAttrs: InnateAttributes): Record<string, number> {
  const output: Record<string, number> = {};
  for (const [key, value] of Object.entries(chineseAttrs)) {
    const mapped = CHINESE_TO_ENGLISH_MAP[key];
    if (mapped) output[mapped] = toFiniteNumber(value);
  }
  return output;
}

export function convertToInfiniteAttributes(chineseAttrs: InnateAttributes): Record<string, number> {
  const output: Record<string, number> = {};
  for (const [key, value] of Object.entries(chineseAttrs)) {
    const mapped = CHINESE_TO_INFINITE_MAP[key];
    if (mapped) output[mapped] = toFiniteNumber(value);
  }
  return output;
}

export function convertFromInfiniteAttributes(infiniteAttrs: Record<string, number>): InnateAttributes {
  const output = emptyLegacyAttributes();
  for (const [key, value] of Object.entries(infiniteAttrs || {})) {
    const legacyKey = resolveLegacyAttrKey(key);
    if (!legacyKey) continue;
    output[legacyKey] = toFiniteNumber(value);
  }
  return output;
}

export function getAttributeDescription(attributeName: string, value: number): string {
  const key = resolveLegacyAttrKey(attributeName) || resolveLegacyAttrKey(CHINESE_TO_INFINITE_MAP[attributeName] || '');
  const level = Math.max(0, Math.round(toFiniteNumber(value)));

  const labels: Record<keyof InnateAttributes, string[]> = {
    根骨: ['羸弱', '普通', '结实', '强健', '怪力'],
    灵性: ['迟钝', '普通', '敏锐', '洞察', '先觉'],
    悟性: ['迟缓', '普通', '聪慧', '卓越', '超限'],
    气运: ['倒霉', '普通', '顺利', '福佑', '天命'],
    魅力: ['冷淡', '普通', '亲和', '出众', '支配'],
    心性: ['脆弱', '普通', '坚韧', '钢铁', '不屈'],
  };

  if (!key) return `未知属性(${level})`;
  const bucket = level >= 15 ? 4 : level >= 10 ? 3 : level >= 6 ? 2 : level >= 3 ? 1 : 0;
  return labels[key][bucket];
}
