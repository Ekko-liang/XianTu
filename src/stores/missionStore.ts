import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { generateMission } from '@/utils/missionGeneration/missionGenerator';
import type { Mission, MissionDifficulty, MissionResult, MissionWorldType } from '@/types/mission';

export const useMissionStore = defineStore('mission', () => {
  const isGenerating = ref(false);
  const availableMissions = ref<Mission[]>([]);
  const currentMission = ref<Mission | null>(null);
  const missionHistory = ref<MissionResult[]>([]);

  const hasActiveMission = computed(() => {
    return currentMission.value != null && currentMission.value.status !== 'completed' && currentMission.value.status !== 'failed';
  });

  const generateAvailableMissions = async (count = 3, difficulty: MissionDifficulty = 'D') => {
    isGenerating.value = true;
    try {
      const next: Mission[] = [];
      for (let i = 0; i < count; i += 1) {
        const mission = await generateMission({
          difficulty,
        });
        next.push(mission);
      }
      availableMissions.value = next;
    } finally {
      isGenerating.value = false;
    }
  };

  const generateMissionByType = async (worldType: MissionWorldType, difficulty: MissionDifficulty = 'D') => {
    isGenerating.value = true;
    try {
      const mission = await generateMission({
        worldType,
        difficulty,
      });
      availableMissions.value = [mission];
    } finally {
      isGenerating.value = false;
    }
  };

  const selectMission = (missionId: string) => {
    const picked = availableMissions.value.find((mission) => mission.id === missionId) ?? null;
    if (!picked) return;
    currentMission.value = {
      ...picked,
      status: 'briefing',
    };
  };

  const activateCurrentMission = () => {
    if (!currentMission.value) return;
    currentMission.value = {
      ...currentMission.value,
      status: 'active',
    };
  };

  const markMissionCompleted = (result?: Partial<MissionResult>) => {
    if (!currentMission.value) return;

    const mission = currentMission.value;
    currentMission.value = {
      ...mission,
      status: 'completed',
    };

    const settlement: MissionResult = {
      missionId: mission.id,
      missionName: mission.name,
      difficulty: result?.difficulty ?? mission.difficulty,
      success: true,
      pointsGained: result?.pointsGained ?? mission.rewards.basePoints,
      soulGrowth: result?.soulGrowth ?? Math.max(10, Math.floor(mission.rewards.basePoints * 0.12)),
      rating: result?.rating ?? 80,
      finishedAt: result?.finishedAt ?? new Date().toISOString(),
      teamImpact: result?.teamImpact,
      summary: result?.summary,
    };
    missionHistory.value.unshift(settlement);
    return settlement;
  };

  const markMissionFailed = (result?: Partial<MissionResult>) => {
    if (!currentMission.value) return;

    const mission = currentMission.value;
    currentMission.value = {
      ...mission,
      status: 'failed',
    };

    const settlement: MissionResult = {
      missionId: mission.id,
      missionName: mission.name,
      difficulty: result?.difficulty ?? mission.difficulty,
      success: false,
      pointsGained: result?.pointsGained ?? Math.floor(mission.rewards.basePoints * 0.2),
      soulGrowth: result?.soulGrowth ?? Math.max(2, Math.floor(mission.rewards.basePoints * 0.04)),
      rating: result?.rating ?? 35,
      finishedAt: result?.finishedAt ?? new Date().toISOString(),
      teamImpact: result?.teamImpact,
      summary: result?.summary,
    };
    missionHistory.value.unshift(settlement);
    return settlement;
  };

  const clearCurrentMission = () => {
    currentMission.value = null;
  };

  const setAvailableMissions = (missions: Mission[]) => {
    availableMissions.value = Array.isArray(missions) ? [...missions] : [];
  };

  const setCurrentMission = (mission: Mission | null) => {
    currentMission.value = mission ? { ...mission } : null;
  };

  const setMissionHistory = (history: MissionResult[]) => {
    missionHistory.value = Array.isArray(history) ? [...history] : [];
  };

  const syncFromGameState = (input: {
    availableMissions?: Mission[] | null;
    currentMission?: Mission | null;
    missionHistory?: MissionResult[] | null;
  }) => {
    if (Array.isArray(input.availableMissions)) {
      setAvailableMissions(input.availableMissions);
    }
    if (input.currentMission !== undefined) {
      setCurrentMission(input.currentMission ?? null);
    }
    if (Array.isArray(input.missionHistory)) {
      setMissionHistory(input.missionHistory);
    }
  };

  return {
    isGenerating,
    availableMissions,
    currentMission,
    missionHistory,
    hasActiveMission,
    generateAvailableMissions,
    generateMissionByType,
    selectMission,
    activateCurrentMission,
    markMissionCompleted,
    markMissionFailed,
    clearCurrentMission,
    setAvailableMissions,
    setCurrentMission,
    setMissionHistory,
    syncFromGameState,
  };
});
