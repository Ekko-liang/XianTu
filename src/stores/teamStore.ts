import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import type { TeamMember, TeamState } from '@/types/mission';

const initialState = (): TeamState => ({
  members: [],
  sharedResources: [],
  teamLevel: 1,
  collaborationLogs: [],
  teamEvents: [],
});

export const useTeamStore = defineStore('team', () => {
  const team = ref<TeamState>(initialState());

  const aliveMembers = computed(() =>
    team.value.members.filter((member) => member.status === 'active' || member.status === 'injured'),
  );

  const setTeamMembers = (members: TeamMember[]) => {
    team.value = {
      ...team.value,
      members: [...members],
    };
  };

  const updateMemberTrust = (memberId: string, trust: number) => {
    team.value = {
      ...team.value,
      members: team.value.members.map((member) =>
        member.id === memberId ? { ...member, trust: Math.max(0, Math.min(100, trust)) } : member,
      ),
    };
  };

  const resetTeam = () => {
    team.value = initialState();
  };

  return {
    team,
    aliveMembers,
    setTeamMembers,
    updateMemberTrust,
    resetTeam,
  };
});
