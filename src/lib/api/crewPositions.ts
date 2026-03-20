import { invoke } from '@tauri-apps/api/core';
import type { CrewPosition, CreateCrewPosition, UpdateCrewPosition } from '../../types/crewPosition';

export const crewPositionsApi = {
  list: (sessionToken: string, activeOnly?: boolean) =>
    invoke<CrewPosition[]>('list_crew_positions', { sessionToken, activeOnly }),

  create: (sessionToken: string, input: CreateCrewPosition) =>
    invoke<CrewPosition>('create_crew_position', { sessionToken, input }),

  update: (sessionToken: string, positionId: string, input: UpdateCrewPosition) =>
    invoke<CrewPosition>('update_crew_position', { sessionToken, positionId, input }),

  delete: (sessionToken: string, positionId: string) =>
    invoke<void>('delete_crew_position', { sessionToken, positionId }),
};
