export interface CrewPosition {
  id: string;
  name: string;
  sortOrder: number;
  isDefault: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCrewPosition {
  name: string;
  sortOrder?: number;
}

export interface UpdateCrewPosition {
  name?: string;
  sortOrder?: number;
}
