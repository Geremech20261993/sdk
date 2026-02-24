// Auto-generated types from contract spec

export enum GroupStatus {
  Forming = 0,
  Active = 1,
  Completed = 2,
  Cancelled = 3
}

export enum RoundStatus {
  Pending = 0,
  Collecting = 1,
  Completed = 2
}

/**
 * Savings group data structure
 */
export interface SavingsGroup {
  id: number;
  name: string;
  admin: string;
  token: string;
  contribution_amount: bigint;
  cycle_length: number;
  max_members: number;
  current_round: number;
  status: GroupStatus;
  members: string[];
  created_at: number;
}

/**
 * Round information
 */
export interface RoundInfo {
  round_number: number;
  recipient: string;
  contribution_amount: bigint;
  total_collected: bigint;
  status: RoundStatus;
  contributions: Map<string, bigint>;
}

