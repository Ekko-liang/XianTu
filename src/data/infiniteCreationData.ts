/**
 * 主神空间无限流 - 创角数据
 *
 * 简化流程（3 步）：金手指 | 基础属性(30点) | 最终确认
 * - 金手指：D级/未激活起步，可进阶，避免开局强度失衡
 * - 基础属性：固定 30 点分配
 * - 穿越前身份：确认页选填文本框，纯叙事用途
 */

// =======================================================================
//                           金手指（D级/未激活起步，可进阶）
// =======================================================================

export type GoldenFingerLevel = '未激活' | 'D' | 'C' | 'B' | 'A' | 'S' | 'SS' | 'SSS';

export interface GoldenFinger {
  id: number;
  name: string;
  description: string;
  /** 初期等级：与玩家同级的 D 级或未激活，避免强度失衡 */
  initialLevel: 'D' | '未激活';
  /** 进阶路径：随副本完成可逐步解锁 */
  advancePath: GoldenFingerLevel[];
  /** 类型标签，便于分类展示 */
  category: '系统' | '时间' | '情报' | '成长' | '特殊';
}

export const INFINITE_GOLDEN_FINGERS: GoldenFinger[] = [
  {
    id: 201,
    name: '随身空间',
    description: '可收纳物品的异空间，初期容量有限。随等级提升扩大容积与功能。',
    initialLevel: 'D',
    advancePath: ['D', 'C', 'B', 'A', 'S', 'SS', 'SSS'],
    category: '系统',
  },
  {
    id: 202,
    name: '任务提示',
    description: '偶尔能接收到模糊的提示信息，指向关键线索或危险。初期触发率低且内容简略。',
    initialLevel: '未激活',
    advancePath: ['未激活', 'D', 'C', 'B', 'A', 'S'],
    category: '系统',
  },
  {
    id: 203,
    name: '时感加速',
    description: '在危急时刻主观时间流速变慢，便于做出反应。初期持续时间极短。',
    initialLevel: 'D',
    advancePath: ['D', 'C', 'B', 'A', 'S', 'SS'],
    category: '时间',
  },
  {
    id: 204,
    name: '预知片段',
    description: '极低概率在关键节点前获得模糊的未来片段。初期几乎不可控。',
    initialLevel: '未激活',
    advancePath: ['未激活', 'D', 'C', 'B', 'A', 'S'],
    category: '情报',
  },
  {
    id: 205,
    name: '鉴定之眼',
    description: '可查看物品、生物的基础信息。初期信息量少且可能出错。',
    initialLevel: 'D',
    advancePath: ['D', 'C', 'B', 'A', 'S'],
    category: '情报',
  },
  {
    id: 206,
    name: '双倍神点',
    description: '副本结算时神点获取有小幅加成。初期加成约 5%，随等级提升。',
    initialLevel: 'D',
    advancePath: ['D', 'C', 'B', 'A', 'S'],
    category: '成长',
  },
  {
    id: 207,
    name: '吞噬',
    description: '击败特定目标后可吸收其部分特质。初期限制多、收益低。',
    initialLevel: '未激活',
    advancePath: ['未激活', 'D', 'C', 'B', 'A', 'S', 'SS'],
    category: '特殊',
  },
  {
    id: 208,
    name: '契约',
    description: '可与副本内生物建立临时契约，获得协助。初期契约对象弱且不稳定。',
    initialLevel: '未激活',
    advancePath: ['未激活', 'D', 'C', 'B', 'A', 'S'],
    category: '特殊',
  },
];

// =======================================================================
//                           基础属性固定点数
// =======================================================================

/** 无限流创角时，基础属性固定分配点数 */
export const INFINITE_ATTRIBUTE_POINTS = 30;
