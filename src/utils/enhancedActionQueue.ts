/**
 * 增强版动作队列系统
 * 支持装备/使用物品的直接操作和撤回恢复功能
 */

import { useCharacterStore } from '@/stores/characterStore';
import { useActionQueueStore } from '@/stores/actionQueueStore';
import type { Item, SaveData } from '@/types/game';
import { toast } from './toast';

export interface UndoAction {
  type: 'equip' | 'unequip' | 'use' | 'discard' | 'cultivate';
  itemId: string;
  itemName: string;
  quantity?: number;
  // 撤回恢复数据
  restoreData?: {
    // 装备操作的恢复数据
    originalSlot?: string | null; // 原来在哪个装备槽位，null表示在背包
    replacedItem?: Item | null; // 被替换的装备
    // 使用/丢弃操作的恢复数据  
    originalQuantity?: number;
    // 功法修炼的恢复数据
    originalCultivationState?: any;
  };
}

export class EnhancedActionQueueManager {
  private static instance: EnhancedActionQueueManager | null = null;
  private undoActions: UndoAction[] = [];
  
  static getInstance(): EnhancedActionQueueManager {
    if (!this.instance) {
      this.instance = new EnhancedActionQueueManager();
    }
    return this.instance;
  }
  
  /**
   * 装备物品 - 直接修改装备栏并支持撤回
   */
  async equipItem(item: Item): Promise<boolean> {
    const characterStore = useCharacterStore();
    const actionQueue = useActionQueueStore();
    
    try {
      const saveData = characterStore.activeSaveSlot?.存档数据;
      if (!saveData) {
        toast.error('存档数据不存在，无法装备');
        return false;
      }
      
      if (!saveData.装备栏) {
        saveData.装备栏 = { 装备1: null, 装备2: null, 装备3: null, 装备4: null, 装备5: null, 装备6: null };
      }
      
      // 检查是否已装备
      if (this.isEquipped(item)) {
        toast.info(`《${item.名称}》已经装备在身上了`);
        return false;
      }
      
      // 检查互斥操作：如果队列中有同一物品的卸下操作，先移除它
      this.removeConflictingActions(item.物品ID, 'unequip');
      
      // 寻找空槽位或需要替换的槽位
      let targetSlot: string | null = null;
      let replacedItem: Item | null = null;
      
      for (let i = 1; i <= 6; i++) {
        const slotKey = `装备${i}` as keyof typeof saveData.装备栏;
        if (!saveData.装备栏[slotKey]) {
          targetSlot = slotKey;
          break;
        }
      }
      
      if (!targetSlot) {
        // 装备栏已满，替换第一个槽位
        targetSlot = '装备1';
        const slotKey = targetSlot as keyof typeof saveData.装备栏;
        replacedItem = saveData.装备栏[slotKey] as Item;
        if (replacedItem) {
          // 将被替换的装备放回背包
          saveData.背包.物品[replacedItem.物品ID] = replacedItem;
        }
      }
      
      // 执行装备操作
      saveData.装备栏[targetSlot as keyof typeof saveData.装备栏] = item;
      
      // 从背包移除
      delete saveData.背包.物品[item.物品ID];
      
      // 创建撤回数据
      const undoAction: UndoAction = {
        type: 'equip',
        itemId: item.物品ID,
        itemName: item.名称,
        restoreData: {
          originalSlot: null, // 原来在背包
          replacedItem
        }
      };
      this.undoActions.push(undoAction);
      
      // 添加到动作队列显示
      actionQueue.addAction({
        type: 'equip',
        itemName: item.名称,
        itemType: item.类型,
        description: replacedItem 
          ? `装备了《${item.名称}》，替换了《${replacedItem.名称}》`
          : `装备了《${item.名称}》`
      });
      
      toast.success(`已装备《${item.名称}》`);
      return true;
      
    } catch (error) {
      console.error('装备物品失败:', error);
      toast.error('装备失败');
      return false;
    }
  }
  
  /**
   * 卸下装备 - 直接修改装备栏并支持撤回
   */
  async unequipItem(item: Item): Promise<boolean> {
    const characterStore = useCharacterStore();
    const actionQueue = useActionQueueStore();
    
    try {
      const saveData = characterStore.activeSaveSlot?.存档数据;
      if (!saveData || !saveData.装备栏) {
        toast.error('装备栏数据不存在');
        return false;
      }
      
      // 检查互斥操作：如果队列中有同一物品的装备操作，先移除它
      this.removeConflictingActions(item.物品ID, 'equip');
      
      // 找到物品在哪个槽位
      let sourceSlot: string | null = null;
      for (let i = 1; i <= 6; i++) {
        const slotKey = `装备${i}` as keyof typeof saveData.装备栏;
        const slotItem = saveData.装备栏[slotKey] as Item;
        if (slotItem && slotItem.物品ID === item.物品ID) {
          sourceSlot = slotKey;
          break;
        }
      }
      
      if (!sourceSlot) {
        toast.error('未找到装备位置');
        return false;
      }
      
      // 执行卸下操作
      saveData.装备栏[sourceSlot as keyof typeof saveData.装备栏] = null;
      saveData.背包.物品[item.物品ID] = item;
      
      // 创建撤回数据
      const undoAction: UndoAction = {
        type: 'unequip',
        itemId: item.物品ID,
        itemName: item.名称,
        restoreData: {
          originalSlot: sourceSlot
        }
      };
      this.undoActions.push(undoAction);
      
      // 添加到动作队列显示
      actionQueue.addAction({
        type: 'unequip',
        itemName: item.名称,
        itemType: item.类型,
        description: `卸下了《${item.名称}》`
      });
      
      toast.success(`已卸下《${item.名称}》`);
      return true;
      
    } catch (error) {
      console.error('卸下装备失败:', error);
      toast.error('卸下失败');
      return false;
    }
  }
  
  /**
   * 使用物品 - 直接减少数量并支持撤回
   */
  async useItem(item: Item, quantity: number = 1): Promise<boolean> {
    const characterStore = useCharacterStore();
    const actionQueue = useActionQueueStore();
    
    try {
      const saveData = characterStore.activeSaveSlot?.存档数据;
      if (!saveData) {
        toast.error('存档数据不存在');
        return false;
      }
      
      const inventoryItem = saveData.背包.物品[item.物品ID];
      if (!inventoryItem || inventoryItem.数量 < quantity) {
        toast.error('物品数量不足');
        return false;
      }
      
      const originalQuantity = inventoryItem.数量;
      
      // 执行使用操作
      if (inventoryItem.数量 === quantity) {
        // 完全使用完，删除物品
        delete saveData.背包.物品[item.物品ID];
      } else {
        // 减少数量
        inventoryItem.数量 -= quantity;
      }
      
      // 创建撤回数据
      const undoAction: UndoAction = {
        type: 'use',
        itemId: item.物品ID,
        itemName: item.名称,
        quantity,
        restoreData: {
          originalQuantity
        }
      };
      this.undoActions.push(undoAction);
      
      // 添加到动作队列显示
      actionQueue.addAction({
        type: 'use',
        itemName: item.名称,
        itemType: item.类型,
        description: `使用了 ${quantity} 个《${item.名称}》`
      });
      
      toast.success(`使用了 ${quantity} 个《${item.名称}》`);
      return true;
      
    } catch (error) {
      console.error('使用物品失败:', error);
      toast.error('使用失败');
      return false;
    }
  }
  
  /**
   * 修炼功法 - 直接修改修炼状态并支持撤回
   */
  async cultivateItem(item: Item): Promise<boolean> {
    const characterStore = useCharacterStore();
    const actionQueue = useActionQueueStore();
    
    try {
      const saveData = characterStore.activeSaveSlot?.存档数据;
      if (!saveData) {
        toast.error('存档数据不存在，无法修炼功法');
        return false;
      }
      
      if (item.类型 !== '功法') {
        toast.error('只能修炼功法类物品');
        return false;
      }
      
      // 确保修炼功法数据结构存在
      if (!saveData.修炼功法) {
        saveData.修炼功法 = {
          功法: null,
          熟练度: 0,
          已解锁技能: [],
          修炼时间: 0,
          突破次数: 0
        };
      }
      
      const skillSlots = saveData.修炼功法;
      let previousTechnique: any = null;
      
      // 检查是否已经在修炼其他功法
      if (skillSlots.功法 && skillSlots.功法.物品ID !== item.物品ID) {
        previousTechnique = skillSlots.功法;
        // 将之前的功法放回背包
        saveData.背包.物品[previousTechnique.物品ID] = {
          物品ID: previousTechnique.物品ID,
          名称: previousTechnique.名称,
          类型: '功法',
          品质: previousTechnique.品质,
          数量: 1,
          功法效果: previousTechnique.功法效果 || {},
          功法技能: previousTechnique.功法技能 || {}
        };
      }
      
      // 设置修炼功法
      skillSlots.功法 = {
        物品ID: item.物品ID,
        名称: item.名称,
        类型: '功法',
        品质: item.品质,
        数量: 1,
        描述: item.描述 || '',
        功法效果: (item as any).功法效果 || {},
        功法技能: (item as any).功法技能 || {},
        修炼进度: skillSlots.功法?.修炼进度 || 0
      };
      
      // 初始化修炼数据
      if (typeof skillSlots.熟练度 !== 'number') skillSlots.熟练度 = 0;
      if (typeof skillSlots.修炼时间 !== 'number') skillSlots.修炼时间 = 0;
      if (typeof skillSlots.突破次数 !== 'number') skillSlots.突破次数 = 0;
      
      // 从背包移除功法
      delete saveData.背包.物品[item.物品ID];
      
      // 创建撤回数据
      const undoAction: UndoAction = {
        type: 'cultivate',
        itemId: item.物品ID,
        itemName: item.名称,
        restoreData: {
          originalCultivationState: {
            previousTechnique,
            wasInInventory: true
          }
        }
      };
      this.undoActions.push(undoAction);
      
      // 添加到动作队列显示
      actionQueue.addAction({
        type: 'cultivate',
        itemName: item.名称,
        itemType: item.类型,
        description: previousTechnique 
          ? `开始修炼《${item.名称}》功法，停止修炼《${previousTechnique.名称}》`
          : `开始修炼《${item.名称}》功法`
      });
      
      toast.success(`开始修炼《${item.名称}》`);
      return true;
      
    } catch (error) {
      console.error('修炼功法失败:', error);
      toast.error('修炼功法失败');
      return false;
    }
  }
  
  /**
   * 停止修炼功法
   */
  async stopCultivation(item: Item): Promise<boolean> {
    const characterStore = useCharacterStore();
    const actionQueue = useActionQueueStore();
    
    try {
      const saveData = characterStore.activeSaveSlot?.存档数据;
      if (!saveData?.修炼功法?.功法) {
        toast.error('当前没有正在修炼的功法');
        return false;
      }
      
      const techniqueToStop = saveData.修炼功法.功法;
      if (techniqueToStop.名称 !== item.名称) {
        toast.error('操作的功法与当前修炼的功法不符');
        return false;
      }
      
      // 将功法移回背包
      saveData.背包.物品[techniqueToStop.物品ID] = {
        物品ID: techniqueToStop.物品ID,
        名称: techniqueToStop.名称,
        类型: '功法',
        品质: techniqueToStop.品质,
        数量: 1,
        功法效果: techniqueToStop.功法效果 || {},
        功法技能: techniqueToStop.功法技能 || {}
      };
      
      // 清空修炼槽位
      saveData.修炼功法.功法 = null;
      
      // 创建撤回数据
      const undoAction: UndoAction = {
        type: 'cultivate',
        itemId: item.物品ID,
        itemName: item.名称,
        restoreData: {
          originalCultivationState: {
            previousTechnique: techniqueToStop,
            wasInInventory: false
          }
        }
      };
      this.undoActions.push(undoAction);
      
      // 添加到动作队列显示
      actionQueue.addAction({
        type: 'cultivate',
        itemName: item.名称,
        itemType: item.类型,
        description: `停止修炼《${item.名称}》功法`
      });
      
      toast.success(`已停止修炼《${item.名称}》`);
      return true;
      
    } catch (error) {
      console.error('停止修炼失败:', error);
      toast.error('停止修炼失败');
      return false;
    }
  }
  
  /**
   * 检查物品是否已装备
   */
  private isEquipped(item: Item): boolean {
    const characterStore = useCharacterStore();
    const saveData = characterStore.activeSaveSlot?.存档数据;
    if (!saveData?.装备栏) return false;
    
    for (let i = 1; i <= 6; i++) {
      const slotKey = `装备${i}` as keyof typeof saveData.装备栏;
      const slotItem = saveData.装备栏[slotKey] as Item;
      if (slotItem && slotItem.物品ID === item.物品ID) {
        return true;
      }
    }
    return false;
  }
  
  /**
   * 撤回上一个动作
   */
  async undoLastAction(): Promise<boolean> {
    if (this.undoActions.length === 0) {
      toast.info('没有可撤回的动作');
      return false;
    }
    
    const lastAction = this.undoActions.pop()!;
    const characterStore = useCharacterStore();
    const actionQueue = useActionQueueStore();
    
    try {
      const saveData = characterStore.activeSaveSlot?.存档数据;
      if (!saveData) {
        toast.error('存档数据不存在');
        return false;
      }
      
      switch (lastAction.type) {
        case 'equip':
          await this.undoEquip(lastAction, saveData);
          break;
        case 'unequip':
          await this.undoUnequip(lastAction, saveData);
          break;
        case 'use':
          await this.undoUse(lastAction, saveData);
          break;
        case 'cultivate':
          await this.undoCultivate(lastAction, saveData);
          break;
      }
      
      // 从动作队列中移除最后一个对应的动作
      const actions = actionQueue.pendingActions;
      for (let i = actions.length - 1; i >= 0; i--) {
        if (actions[i].itemName === lastAction.itemName && actions[i].type === lastAction.type) {
          actionQueue.removeAction(actions[i].id);
          break;
        }
      }
      
      toast.success(`已撤回：${lastAction.itemName}`);
      return true;
      
    } catch (error) {
      console.error('撤回动作失败:', error);
      toast.error('撤回失败');
      return false;
    }
  }
  
  private async undoEquip(action: UndoAction, saveData: SaveData): Promise<void> {
    // 找到装备的位置并移回背包
    for (let i = 1; i <= 6; i++) {
      const slotKey = `装备${i}` as keyof typeof saveData.装备栏;
      const slotItem = saveData.装备栏[slotKey] as Item;
      if (slotItem && slotItem.物品ID === action.itemId) {
        // 移回背包
        saveData.背包.物品[action.itemId] = slotItem;
        saveData.装备栏[slotKey] = null;
        
        // 如果有被替换的装备，恢复它
        if (action.restoreData?.replacedItem) {
          saveData.装备栏[slotKey] = action.restoreData.replacedItem;
          delete saveData.背包.物品[action.restoreData.replacedItem.物品ID];
        }
        break;
      }
    }
  }
  
  private async undoUnequip(action: UndoAction, saveData: SaveData): Promise<void> {
    const item = saveData.背包.物品[action.itemId];
    if (!item || !action.restoreData?.originalSlot) return;
    
    // 重新装备到原来的槽位
    const slotKey = action.restoreData.originalSlot as keyof typeof saveData.装备栏;
    saveData.装备栏[slotKey] = item;
    delete saveData.背包.物品[action.itemId];
  }
  
  private async undoUse(action: UndoAction, saveData: SaveData): Promise<void> {
    const originalQuantity = action.restoreData?.originalQuantity;
    if (!originalQuantity) return;
    
    // 恢复物品数量
    const existingItem = saveData.背包.物品[action.itemId];
    if (existingItem) {
      existingItem.数量 = originalQuantity;
    } else {
      // 需要重新创建物品（这需要从某处获取物品模板）
      // 这里暂时只恢复数量，实际实现时需要完整的物品数据
      toast.warning('物品已完全消失，无法完全恢复');
    }
  }
  
  private async undoCultivate(action: UndoAction, saveData: SaveData): Promise<void> {
    const cultivationState = action.restoreData?.originalCultivationState;
    if (!cultivationState) return;
    
    if (cultivationState.wasInInventory) {
      // 原来在背包，恢复到背包
      const currentTechnique = saveData.修炼功法?.功法;
      if (currentTechnique && currentTechnique.物品ID === action.itemId) {
        // 将当前修炼的功法移回背包
        saveData.背包.物品[action.itemId] = {
          物品ID: currentTechnique.物品ID,
          名称: currentTechnique.名称,
          类型: '功法',
          品质: currentTechnique.品质,
          数量: 1,
          功法效果: currentTechnique.功法效果 || {},
          功法技能: currentTechnique.功法技能 || {}
        };
        
        // 恢复之前的修炼状态
        if (cultivationState.previousTechnique) {
          saveData.修炼功法.功法 = cultivationState.previousTechnique;
          delete saveData.背包.物品[cultivationState.previousTechnique.物品ID];
        } else {
          saveData.修炼功法.功法 = null;
        }
      }
    } else {
      // 原来在修炼，恢复修炼状态
      if (cultivationState.previousTechnique) {
        saveData.修炼功法.功法 = cultivationState.previousTechnique;
        delete saveData.背包.物品[action.itemId];
      }
    }
  }
  
  /**
   * 清空撤回历史
   */
  clearUndoHistory(): void {
    this.undoActions = [];
  }
  
  /**
   * 获取可撤回动作数量
   */
  getUndoActionsCount(): number {
    return this.undoActions.length;
  }
  
  /**
   * 移除冲突的动作（装备/卸下互斥）
   */
  private removeConflictingActions(itemId: string, conflictType: 'equip' | 'unequip'): void {
    const actionQueue = useActionQueueStore();
    
    // 从显示队列中移除冲突的动作
    const conflictingActions = actionQueue.pendingActions.filter(action => 
      action.itemName && action.type === conflictType && 
      // 这里需要通过名称匹配，因为action中没有itemId
      this.findItemByName(action.itemName)?.物品ID === itemId
    );
    
    conflictingActions.forEach(action => {
      actionQueue.removeAction(action.id);
    });
    
    // 从撤回历史中移除对应的记录
    this.undoActions = this.undoActions.filter(undoAction => 
      !(undoAction.itemId === itemId && undoAction.type === conflictType)
    );
    
    if (conflictingActions.length > 0) {
      toast.info('已移除冲突的操作');
    }
  }
  
  /**
   * 通过名称查找物品（辅助函数）
   */
  private findItemByName(itemName: string): Item | null {
    const characterStore = useCharacterStore();
    const saveData = characterStore.activeSaveSlot?.存档数据;
    if (!saveData) return null;
    
    // 在背包中查找
    for (const item of Object.values(saveData.背包.物品)) {
      if (item.名称 === itemName) {
        return item;
      }
    }
    
    // 在装备栏中查找
    if (saveData.装备栏) {
      for (let i = 1; i <= 6; i++) {
        const slotKey = `装备${i}` as keyof typeof saveData.装备栏;
        const item = saveData.装备栏[slotKey] as Item;
        if (item && item.名称 === itemName) {
          return item;
        }
      }
    }
    
    return null;
  }
}