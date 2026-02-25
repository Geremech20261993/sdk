/**
 * Group Indexer Service for Sorosave Protocol
 * Polls Stellar Horizon and indexes contract events into SQLite
 */

import Database from "better-sqlite3";
import axios from "axios";
import { EventEmitter } from "events";

interface IndexerConfig {
  horizonUrl: string;
  contractId: string;
  pollInterval: number; // milliseconds
  dbPath: string;
}

interface ContractEvent {
  id: string;
  type: string;
  data: any;
  ledger: number;
  timestamp: string;
}

interface Group {
  id: string;
  name: string;
  description: string;
  targetAmount: number;
  contributionAmount: number;
  contributionPeriod: number;
  maxMembers: number;
  token: string;
  creator: string;
  createdAt: string;
  status: string;
  totalSaved: number;
  memberCount: number;
  ledger: number;
}

interface Member {
  groupId: string;
  address: string;
  joinedAt: string;
  totalContributed: number;
  isAdmin: boolean;
  ledger: number;
}

export class GroupIndexer extends EventEmitter {
  private db: Database.Database;
  private config: IndexerConfig;
  private isRunning: boolean = false;
  private lastLedger: number = 0;
  private pollTimer?: NodeJS.Timeout;

  constructor(config: Partial<IndexerConfig> = {}) {
    super();
    this.config = {
      horizonUrl: config.horizonUrl || "https://horizon-testnet.stellar.org",
      contractId: config.contractId || "",
      pollInterval: config.pollInterval || 5000,
      dbPath: config.dbPath || "./indexer.db",
    };

    // Initialize SQLite database
    this.db = new Database(this.config.dbPath);
    this.initDatabase();
  }

  /**
   * Initialize database schema
   */
  private initDatabase(): void {
    // Groups table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS groups (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        target_amount INTEGER NOT NULL,
        contribution_amount INTEGER NOT NULL,
        contribution_period INTEGER NOT NULL,
        max_members INTEGER NOT NULL,
        token TEXT NOT NULL,
        creator TEXT NOT NULL,
        created_at TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'forming',
        total_saved INTEGER DEFAULT 0,
        member_count INTEGER DEFAULT 0,
        ledger INTEGER NOT NULL,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Members table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS members (
        group_id TEXT NOT NULL,
        address TEXT NOT NULL,
        joined_at TEXT NOT NULL,
        total_contributed INTEGER DEFAULT 0,
        is_admin BOOLEAN DEFAULT 0,
        ledger INTEGER NOT NULL,
        PRIMARY KEY (group_id, address),
        FOREIGN KEY (group_id) REFERENCES groups(id)
      )
    `);

    // Events table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        group_id TEXT,
        data TEXT NOT NULL,
        ledger INTEGER NOT NULL,
        timestamp TEXT NOT NULL
      )
    `);

    // Contributions table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS contributions (
        id TEXT PRIMARY KEY,
        group_id TEXT NOT NULL,
        member_address TEXT NOT NULL,
        amount INTEGER NOT NULL,
        round INTEGER NOT NULL,
        ledger INTEGER NOT NULL,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (group_id) REFERENCES groups(id)
      )
    `);

    // Create indexes
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_groups_status ON groups(status)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_groups_token ON groups(token)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_members_address ON members(address)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_events_type ON events(type)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_events_ledger ON events(ledger)`);

    // Get last indexed ledger
    const row = this.db.prepare("SELECT MAX(ledger) as max_ledger FROM events").get() as any;
    this.lastLedger = row?.max_ledger || 0;

    console.log(`📊 Indexer initialized. Last ledger: ${this.lastLedger}`);
  }

  /**
   * Start the indexer
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log("Indexer is already running");
      return;
    }

    this.isRunning = true;
    console.log("🚀 Starting indexer...");

    // Do initial sync
    await this.sync();

    // Start polling
    this.pollTimer = setInterval(() => {
      this.sync().catch((error) => {
        console.error("Sync error:", error);
        this.emit("error", error);
      });
    }, this.config.pollInterval);

    this.emit("started");
    console.log(`✅ Indexer running (poll interval: ${this.config.pollInterval}ms)`);
  }

  /**
   * Stop the indexer
   */
  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = undefined;
    }

    this.emit("stopped");
    console.log("🛑 Indexer stopped");
  }

  /**
   * Sync events from Horizon
   */
  private async sync(): Promise<void> {
    try {
      // Fetch contract events from Horizon
      const response = await axios.get(
        `${this.config.horizonUrl}/contracts/${this.config.contractId}/events`,
        {
          params: {
            cursor: this.lastLedger,
            limit: 100,
            order: "asc",
          },
        }
      );

      const events = response.data._embedded?.records || [];

      if (events.length === 0) {
        return;
      }

      console.log(`📥 Syncing ${events.length} events...`);

      // Process events
      for (const event of events) {
        await this.processEvent(event);
      }

      // Update last ledger
      if (events.length > 0) {
        this.lastLedger = Math.max(
          ...events.map((e: any) => e.ledger)
        );
      }

      this.emit("synced", { count: events.length, ledger: this.lastLedger });
    } catch (error) {
      console.error("Sync failed:", error);
      this.emit("error", error);
    }
  }

  /**
   * Process a single event
   */
  private async processEvent(event: any): Promise<void> {
    const eventType = event.topic?.[0] || "unknown";
    const eventData = JSON.parse(event.value || "{}");
    const ledger = event.ledger;
    const timestamp = event.created_at;

    // Store event
    const insertEvent = this.db.prepare(`
      INSERT OR IGNORE INTO events (id, type, group_id, data, ledger, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    insertEvent.run(
      event.id,
      eventType,
      eventData.group_id,
      JSON.stringify(eventData),
      ledger,
      timestamp
    );

    // Process based on event type
    switch (eventType) {
      case "group_created":
        this.handleGroupCreated(eventData, ledger);
        break;
      case "member_joined":
        this.handleMemberJoined(eventData, ledger);
        break;
      case "contribution_made":
        this.handleContribution(eventData, ledger, timestamp);
        break;
      case "group_started":
        this.handleGroupStarted(eventData, ledger);
        break;
      case "group_completed":
        this.handleGroupCompleted(eventData, ledger);
        break;
    }

    this.emit("event", { type: eventType, data: eventData });
  }

  /**
   * Handle group_created event
   */
  private handleGroupCreated(data: any, ledger: number): void {
    const insert = this.db.prepare(`
      INSERT OR REPLACE INTO groups
      (id, name, description, target_amount, contribution_amount, contribution_period,
       max_members, token, creator, created_at, status, ledger)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insert.run(
      data.group_id,
      data.name,
      data.description || "",
      data.target_amount,
      data.contribution_amount,
      data.contribution_period,
      data.max_members,
      data.token,
      data.creator,
      data.created_at,
      "forming",
      ledger
    );

    console.log(`✅ Group created: ${data.name}`);
  }

  /**
   * Handle member_joined event
   */
  private handleMemberJoined(data: any, ledger: number): void {
    const insert = this.db.prepare(`
      INSERT OR REPLACE INTO members
      (group_id, address, joined_at, is_admin, ledger)
      VALUES (?, ?, ?, ?, ?)
    `);

    insert.run(
      data.group_id,
      data.member_address,
      data.joined_at,
      data.is_admin ? 1 : 0,
      ledger
    );

    // Update member count
    const update = this.db.prepare(`
      UPDATE groups SET
        member_count = (SELECT COUNT(*) FROM members WHERE group_id = ?),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    update.run(data.group_id, data.group_id);

    console.log(`👤 Member joined: ${data.member_address}`);
  }

  /**
   * Handle contribution_made event
   */
  private handleContribution(data: any, ledger: number, timestamp: string): void {
    const insert = this.db.prepare(`
      INSERT INTO contributions
      (id, group_id, member_address, amount, round, ledger, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insert.run(
      data.contribution_id,
      data.group_id,
      data.member_address,
      data.amount,
      data.round,
      ledger,
      timestamp
    );

    // Update member total
    const updateMember = this.db.prepare(`
      UPDATE members SET
        total_contributed = total_contributed + ?,
        ledger = ?
      WHERE group_id = ? AND address = ?
    `);
    updateMember.run(data.amount, ledger, data.group_id, data.member_address);

    // Update group total
    const updateGroup = this.db.prepare(`
      UPDATE groups SET
        total_saved = total_saved + ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    updateGroup.run(data.amount, data.group_id);

    console.log(`💰 Contribution: ${data.amount} to ${data.group_id}`);
  }

  /**
   * Handle group_started event
   */
  private handleGroupStarted(data: any, ledger: number): void {
    const update = this.db.prepare(`
      UPDATE groups SET
        status = 'active',
        ledger = ?
      WHERE id = ?
    `);
    update.run(ledger, data.group_id);
    console.log(`🚀 Group started: ${data.group_id}`);
  }

  /**
   * Handle group_completed event
   */
  private handleGroupCompleted(data: any, ledger: number): void {
    const update = this.db.prepare(`
      UPDATE groups SET
        status = 'completed',
        ledger = ?
      WHERE id = ?
    `);
    update.run(ledger, data.group_id);
    console.log(`✨ Group completed: ${data.group_id}`);
  }

  // Query methods for REST API

  /**
   * Get all groups with filtering and pagination
   */
  getGroups(
    filter: { status?: string; token?: string } = {},
    limit: number = 20,
    offset: number = 0
  ): { items: any[]; total: number } {
    let whereClause = "1=1";
    const params: any[] = [];

    if (filter.status) {
      whereClause += " AND status = ?";
      params.push(filter.status);
    }

    if (filter.token) {
      whereClause += " AND token = ?";
      params.push(filter.token);
    }

    const countStmt = this.db.prepare(
      `SELECT COUNT(*) as total FROM groups WHERE ${whereClause}`
    );
    const { total } = countStmt.get(...params) as any;

    const selectStmt = this.db.prepare(`
      SELECT * FROM groups
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);

    const items = selectStmt.all(...params, limit, offset);

    return { items, total };
  }

  /**
   * Get a single group by ID
   */
  getGroup(id: string): any | undefined {
    const stmt = this.db.prepare("SELECT * FROM groups WHERE id = ?");
    return stmt.get(id);
  }

  /**
   * Get groups for a member
   */
  getMemberGroups(address: string): any[] {
    const stmt = this.db.prepare(`
      SELECT g.*, m.total_contributed, m.is_admin, m.joined_at
      FROM groups g
      JOIN members m ON g.id = m.group_id
      WHERE m.address = ?
      ORDER BY m.joined_at DESC
    `);
    return stmt.all(address);
  }

  /**
   * Get group members
   */
  getGroupMembers(groupId: string): any[] {
    const stmt = this.db.prepare(`
      SELECT * FROM members WHERE group_id = ? ORDER BY joined_at DESC
    `);
    return stmt.all(groupId);
  }

  /**
   * Get statistics
   */
  getStats(): any {
    const groupCount = this.db.prepare("SELECT COUNT(*) as count FROM groups").get() as any;
    const memberCount = this.db.prepare("SELECT COUNT(*) as count FROM members").get() as any;
    const totalSaved = this.db.prepare("SELECT SUM(total_saved) as total FROM groups").get() as any;
    const eventCount = this.db.prepare("SELECT COUNT(*) as count FROM events").get() as any;

    return {
      groups: groupCount?.count || 0,
      members: memberCount?.count || 0,
      totalSaved: totalSaved?.total || 0,
      events: eventCount?.count || 0,
      lastLedger: this.lastLedger,
    };
  }

  /**
   * Close database connection
   */
  close(): void {
    this.stop();
    this.db.close();
    console.log("📁 Database closed");
  }
}

export default GroupIndexer;
