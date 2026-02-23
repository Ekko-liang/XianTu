import type { MissionDifficulty, MissionWorldType } from '@/types/mission';

export interface MissionTemplate {
  id: string;
  name: string;
  worldType: MissionWorldType;
  difficulty: MissionDifficulty;
  description: string;
  mainQuestTitle: string;
  mainQuestDescription: string;
  sideQuestTitle: string;
  sideQuestDescription: string;
  timeLimit: number;
  survivalCondition: string;
  rewardBasePoints: number;
}

export const LOCAL_MISSION_TEMPLATES: MissionTemplate[] = [
  {
    id: 'tpl_city_blackout_d',
    name: '断电街区',
    worldType: 'modern',
    difficulty: 'D',
    description: '封锁区突发大面积断电，你需要在混乱升级前建立临时秩序。',
    mainQuestTitle: '稳定街区',
    mainQuestDescription: '在6小时内修复关键电力节点，并保护至少两处避难点。',
    sideQuestTitle: '回收应急药品',
    sideQuestDescription: '从坍塌药房中回收可用药品，交付给医疗站。',
    timeLimit: 1,
    survivalCondition: '存活至街区恢复照明，并保证至少一处避难点未失守。',
    rewardBasePoints: 120,
  },
  {
    id: 'tpl_horror_apartment_c',
    name: '7号公寓',
    worldType: 'horror',
    difficulty: 'C',
    description: '一栋封闭公寓每晚都会出现消失的住户。',
    mainQuestTitle: '找出源头',
    mainQuestDescription: '在72小时内定位诡异源并完成封印。',
    sideQuestTitle: '拯救住户',
    sideQuestDescription: '至少救出3名住户并带离公寓。',
    timeLimit: 3,
    survivalCondition: '72小时内离开公寓且未被污染。',
    rewardBasePoints: 280,
  },
  {
    id: 'tpl_apocalypse_station_b',
    name: '灰烬补给站',
    worldType: 'apocalypse',
    difficulty: 'B',
    description: '核冬天中的补给站被多方势力围困。',
    mainQuestTitle: '维持补给线',
    mainQuestDescription: '在5天内确保补给站不失守并送出物资。',
    sideQuestTitle: '修复信标',
    sideQuestDescription: '修复远程信标，建立稳定通信。',
    timeLimit: 5,
    survivalCondition: '补给站未沦陷且主角存活。',
    rewardBasePoints: 680,
  },
  {
    id: 'tpl_scifi_derelict_a',
    name: '失落巡洋舰',
    worldType: 'sci_fi',
    difficulty: 'A',
    description: '废弃战舰漂流于深空，舰内AI已失控。',
    mainQuestTitle: '夺回舰桥控制',
    mainQuestDescription: '在舰体坍塌前重启主控并脱离危险轨道。',
    sideQuestTitle: '回收实验样本',
    sideQuestDescription: '取回核心实验舱中的未知样本。',
    timeLimit: 2,
    survivalCondition: '成功撤离战舰并带回任务目标。',
    rewardBasePoints: 1600,
  },
];
