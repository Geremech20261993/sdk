/**
 * Group Indexer Service
 * Provides efficient indexing and querying for savings groups
 */

export interface Group {
  id: string;
  name: string;
  members: string[];
  totalSavings: bigint;
  createdAt: Date;
  updatedAt: Date;
}

export interface GroupFilter {
  minMembers?: number;
  maxMembers?: number;
  minSavings?: bigint;
  createdAfter?: Date;
  createdBefore?: Date;
}

export class GroupIndexer {
  private groups: Map<string, Group> = new Map();
  private memberIndex: Map<string, Set<string>> = new Map();
  
  /**
   * Index a new group
   */
  async indexGroup(group: Group): Promise<void> {
    this.groups.set(group.id, group);
    
    // Update member index
    for (const member of group.members) {
      if (!this.memberIndex.has(member)) {
        this.memberIndex.set(member, new Set());
      }
      this.memberIndex.get(member)!.add(group.id);
    }
  }
  
  /**
   * Get group by ID
   */
  async getGroup(id: string): Promise<Group | undefined> {
    return this.groups.get(id);
  }
  
  /**
   * Query groups with filters
   */
  async queryGroups(filter: GroupFilter): Promise<Group[]> {
    let results = Array.from(this.groups.values());
    
    if (filter.minMembers !== undefined) {
      results = results.filter(g => g.members.length >= filter.minMembers!);
    }
    
    if (filter.maxMembers !== undefined) {
      results = results.filter(g => g.members.length <= filter.maxMembers!);
    }
    
    if (filter.minSavings !== undefined) {
      results = results.filter(g => g.totalSavings >= filter.minSavings!);
    }
    
    if (filter.createdAfter !== undefined) {
      results = results.filter(g => g.createdAt >= filter.createdAfter!);
    }
    
    if (filter.createdBefore !== undefined) {
      results = results.filter(g => g.createdAt <= filter.createdBefore!);
    }
    
    return results;
  }
  
  /**
   * Get groups by member address
   */
  async getGroupsByMember(member: string): Promise<Group[]> {
    const groupIds = this.memberIndex.get(member);
    if (!groupIds) return [];
    
    return Array.from(groupIds)
      .map(id => this.groups.get(id))
      .filter((g): g is Group => g !== undefined);
  }
  
  /**
   * Get total savings across all groups
   */
  async getTotalSavings(): Promise<bigint> {
    let total = 0n;
    for (const group of this.groups.values()) {
      total += group.totalSavings;
    }
    return total;
  }
}

export default GroupIndexer;
