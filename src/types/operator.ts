export interface Operator {
  id: string;
  name: string;
  logoPath: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOperatorInput {
  name: string;
}

export interface UpdateOperatorInput {
  name?: string;
  active?: boolean;
}
