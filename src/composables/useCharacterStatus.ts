import { computed } from 'vue';
import type { Ref } from 'vue';
import type { CharacterData } from '@/stores/characterStore';
import type { CharacterStatus } from '@/components/game-view/StatusPanel.vue';

// 注意：此处的输入类型是 CharacterData，与 store 统一
export function useCharacterStatus(character: Ref<CharacterData | null | undefined>) {
  
  const characterStatus = computed<CharacterStatus | null>(() => {
    if (!character.value) return null;
    
    // CharacterData 是一个联合类型，需要类型守卫来访问特定属性
    const hp = 'hp' in character.value ? character.value.hp : 0;
    const hp_max = 'hp_max' in character.value ? character.value.hp_max : 1;
    const mana = 'mana' in character.value ? character.value.mana : 0;
    const mana_max = 'mana_max' in character.value ? character.value.mana_max : 1;
    const spirit = 'spirit' in character.value ? character.value.spirit : 0;
    const spirit_max = 'spirit_max' in character.value ? character.value.spirit_max : 1;
    const lifespan = 'lifespan' in character.value ? character.value.lifespan : 0;
    const realm = 'realm' in character.value ? character.value.realm : '未知';
    const reputation = 'reputation' in character.value ? character.value.reputation : 0;
    const cultivation_exp = 'cultivation_exp' in character.value ? character.value.cultivation_exp : 0;
    const cultivation_exp_max = 'cultivation_exp_max' in character.value ? character.value.cultivation_exp_max : 1;

    return {
      name: character.value.character_name,
      realm: realm,
      age: ('current_age' in character.value ? character.value.current_age : 0) ?? 0,
      hp: `${hp} / ${hp_max}`,
      mana: `${mana} / ${mana_max}`,
      spirit: `${spirit} / ${spirit_max}`,
      lifespan: lifespan,
      reputation: reputation,
      cultivation_exp: cultivation_exp,
      cultivation_exp_max: cultivation_exp_max,
      root_bone: character.value.root_bone,
      spirituality: character.value.spirituality,
      comprehension: character.value.comprehension,
      fortune: character.value.fortune,
      charm: character.value.charm,
      temperament: character.value.temperament,
    };
  });

  return {
    characterStatus,
  };
}