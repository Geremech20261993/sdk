// Auto-generated client from contract spec

import * as StellarSdk from "@stellar/stellar-sdk";
import { SavingsGroup, RoundInfo, GroupStatus, RoundStatus } from "./types";

export interface SoroSaveConfig {
  rpcUrl: string;
  contractId: string;
  networkPassphrase: string;
}

/**
 * Auto-generated SoroSave SDK client
 * Generated from contract spec
 */
export class GeneratedSoroSaveClient {
  private server: StellarSdk.rpc.Server;
  private contractId: string;
  private networkPassphrase: string;

  constructor(config: SoroSaveConfig) {
    this.server = new StellarSdk.rpc.Server(config.rpcUrl);
    this.contractId = config.contractId;
    this.networkPassphrase = config.networkPassphrase;
  }

  /**
   * Create a new savings group
   */
  async creategroup(admin: string, name: string, token: string, contribution_amount: bigint, cycle_length: number, max_members: number, source: string): Promise<number> {
    const contract = new StellarSdk.Contract(this.contractId);
    const op = contract.call("create_group", new StellarSdk.Address(admin).toScVal(), StellarSdk.nativeToScVal(name, { type: "string" }), new StellarSdk.Address(token).toScVal(), StellarSdk.nativeToScVal(contribution_amount, { type: "i128" }), StellarSdk.nativeToScVal(cycle_length, { type: "u64" }), StellarSdk.nativeToScVal(max_members, { type: "u32" }));
    return this.buildTransaction(op, source);
  }

  /**
   * Join an existing group
   */
  async joingroup(member: string, group_id: number, source: string): Promise<StellarSdk.Transaction> {
    const contract = new StellarSdk.Contract(this.contractId);
    const op = contract.call("join_group", new StellarSdk.Address(member).toScVal(), StellarSdk.nativeToScVal(group_id, { type: "u64" }));
    return this.buildTransaction(op, source);
  }

  /**
   * Leave a group (only while forming)
   */
  async leavegroup(member: string, group_id: number, source: string): Promise<StellarSdk.Transaction> {
    const contract = new StellarSdk.Contract(this.contractId);
    const op = contract.call("leave_group", new StellarSdk.Address(member).toScVal(), StellarSdk.nativeToScVal(group_id, { type: "u64" }));
    return this.buildTransaction(op, source);
  }

  /**
   * Start the savings cycle
   */
  async startgroup(group_id: number, source: string): Promise<StellarSdk.Transaction> {
    const contract = new StellarSdk.Contract(this.contractId);
    const op = contract.call("start_group", StellarSdk.nativeToScVal(group_id, { type: "u64" }));
    return this.buildTransaction(op, source);
  }

  /**
   * Make a contribution
   */
  async contribute(member: string, group_id: number, amount: bigint, source: string): Promise<StellarSdk.Transaction> {
    const contract = new StellarSdk.Contract(this.contractId);
    const op = contract.call("contribute", new StellarSdk.Address(member).toScVal(), StellarSdk.nativeToScVal(group_id, { type: "u64" }), StellarSdk.nativeToScVal(amount, { type: "i128" }));
    return this.buildTransaction(op, source);
  }

  /**
   * Distribute funds to recipient
   */
  async distribute(group_id: number, source: string): Promise<StellarSdk.Transaction> {
    const contract = new StellarSdk.Contract(this.contractId);
    const op = contract.call("distribute", StellarSdk.nativeToScVal(group_id, { type: "u64" }));
    return this.buildTransaction(op, source);
  }

  /**
   * Get group details
   */
  async getgroup(group_id: number, source: string): Promise<SavingsGroup> {
    const contract = new StellarSdk.Contract(this.contractId);
    const op = contract.call("get_group", StellarSdk.nativeToScVal(group_id, { type: "u64" }));
    return this.buildTransaction(op, source);
  }

  /**
   * List all groups
   */
  async getgroups(, source: string): Promise<SavingsGroup[]> {
    const contract = new StellarSdk.Contract(this.contractId);
    const op = contract.call("get_groups");
    return this.buildTransaction(op, source);
  }

  private buildTransaction(op: StellarSdk.xdr.Operation, source: string): StellarSdk.Transaction {
    const account = new StellarSdk.Account(source, '0');
    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: '100',
      networkPassphrase: this.networkPassphrase
    }).addOperation(op).setTimeout(30).build();
    return tx;
  }
}
