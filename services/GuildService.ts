/**
 * GuildService — 公会系统
 *
 * 公会创建/加入、成员管理、公会任务、公会战
 */

const STORAGE_KEY = 'wizard_guild_v1';

// ============ 类型 ============

export type GuildRole = 'leader' | 'officer' | 'member';

export interface GuildMember {
  userId: string;
  username: string;
  role: GuildRole;
  joinedAt: number;
  contributions: number;
  lastActive: number;
  rank?: string;
}

export interface GuildQuest {
  id: string;
  name: string;
  description: string;
  target: number;
  current: number;
  reward: { gold: number; pack: number };
  type: 'guild_wins' | 'guild_damage' | 'guild_games';
  expiresAt: number;
}

export interface Guild {
  id: string;
  name: string;
  description: string;
  icon: string;
  level: number;
  experience: number;
  maxMembers: number;
  members: GuildMember[];
  quests: GuildQuest[];
  totalContributions: number;
  createdAt: number;
  banner?: string; // 公会旗帜颜色
  motd?: string;   // 每日公告
}

export interface GuildWarState {
  status: 'idle' | 'matching' | 'active' | 'completed';
  opponentGuildId?: string;
  opponentName?: string;
  ourScore: number;
  theirScore: number;
  endsAt?: number;
}

// ============ 常量 ============

const GUILD_CONFIG = {
  MAX_MEMBERS_BASE: 30,
  MEMBERS_PER_LEVEL: 5,
  EXP_PER_LEVEL: 1000,
  QUEST_REFRESH_INTERVAL: 7 * 24 * 60 * 60 * 1000, // 一周
  CREATION_COST: 500,
} as const;

// 公会图标列表
const GUILD_ICONS = ['🏰', '⚔️', '🛡️', '👑', '🐉', '🦅', '🐺', '🦁', '🔮', '⭐', '🌙', '☀️'];

// ============ Service ============

export class GuildService {

  /** 创建公会 */
  static createGuild(
    userId: string,
    username: string,
    name: string,
    description: string,
    icon: string,
    banner: string = '#6366f1'
  ): Guild {
    return {
      id: `guild_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name,
      description,
      icon,
      level: 1,
      experience: 0,
      maxMembers: GUILD_CONFIG.MAX_MEMBERS_BASE,
      members: [{
        userId,
        username,
        role: 'leader',
        joinedAt: Date.now(),
        contributions: 0,
        lastActive: Date.now(),
      }],
      quests: [],
      totalContributions: 0,
      createdAt: Date.now(),
      banner,
      motd: `欢迎加入 ${name}！`,
    };
  }

  /** 加入公会 */
  static joinGuild(guild: Guild, userId: string, username: string): Guild | null {
    if (guild.members.length >= guild.maxMembers) return null;
    if (guild.members.some(m => m.userId === userId)) return null;

    return {
      ...guild,
      members: [...guild.members, {
        userId,
        username,
        role: 'member',
        joinedAt: Date.now(),
        contributions: 0,
        lastActive: Date.now(),
      }],
    };
  }

  /** 离开公会 */
  static leaveGuild(guild: Guild, userId: string): Guild {
    return {
      ...guild,
      members: guild.members.filter(m => m.userId !== userId),
    };
  }

  /** 踢出成员 */
  static kickMember(guild: Guild, leaderId: string, targetId: string): Guild | null {
    const leader = guild.members.find(m => m.userId === leaderId);
    if (!leader || leader.role !== 'leader') return null;
    if (targetId === leaderId) return null;

    return {
      ...guild,
      members: guild.members.filter(m => m.userId !== targetId),
    };
  }

  /** 任命/降职 */
  static setRole(guild: Guild, leaderId: string, targetId: string, role: GuildRole): Guild | null {
    const leader = guild.members.find(m => m.userId === leaderId);
    if (!leader || leader.role !== 'leader') return null;

    return {
      ...guild,
      members: guild.members.map(m =>
        m.userId === targetId ? { ...m, role } : m
      ),
    };
  }

  /** 捐献金币（获取经验） */
  static contribute(guild: Guild, userId: string, amount: number): Guild {
    const expGain = Math.floor(amount / 10);
    let newExp = guild.experience + expGain;
    let newLevel = guild.level;

    // 升级检查
    while (newExp >= GUILD_CONFIG.EXP_PER_LEVEL) {
      newExp -= GUILD_CONFIG.EXP_PER_LEVEL;
      newLevel++;
    }

    return {
      ...guild,
      experience: newExp,
      level: newLevel,
      totalContributions: guild.totalContributions + amount,
      maxMembers: GUILD_CONFIG.MAX_MEMBERS_BASE + (newLevel - 1) * GUILD_CONFIG.MEMBERS_PER_LEVEL,
      members: guild.members.map(m =>
        m.userId === userId
          ? { ...m, contributions: m.contributions + amount, lastActive: Date.now() }
          : m
      ),
    };
  }

  /** 更新公会任务进度 */
  static updateQuestProgress(
    guild: Guild,
    questType: GuildQuest['type'],
    delta: number
  ): Guild {
    return {
      ...guild,
      quests: guild.quests.map(q =>
        q.type === questType && q.current < q.target
          ? { ...q, current: Math.min(q.target, q.current + delta) }
          : q
      ),
    };
  }

  /** 生成每周公会任务 */
  static generateWeeklyQuests(): GuildQuest[] {
    const now = Date.now();
    const weekMs = GUILD_CONFIG.QUEST_REFRESH_INTERVAL;
    const templates: Omit<GuildQuest, 'id' | 'current' | 'expiresAt'>[] = [
      { name: '公会荣耀', description: '公会成员累计赢得 50 场对战', target: 50, reward: { gold: 500, pack: 2 }, type: 'guild_wins' },
      { name: '输出狂潮', description: '公会成员累计造成 5000 点伤害', target: 5000, reward: { gold: 300, pack: 1 }, type: 'guild_damage' },
      { name: '活跃公会', description: '公会成员累计完成 100 场对战', target: 100, reward: { gold: 400, pack: 2 }, type: 'guild_games' },
    ];

    return templates.map(t => ({
      ...t,
      id: `gq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      current: 0,
      expiresAt: now + weekMs,
    }));
  }

  /** 更新公告 */
  static setMotd(guild: Guild, leaderId: string, motd: string): Guild | null {
    const leader = guild.members.find(m => m.userId === leaderId);
    if (!leader || (leader.role !== 'leader' && leader.role !== 'officer')) return null;
    return { ...guild, motd };
  }

  /** 获取公会排名数据 */
  static getLeaderboardData(guild: Guild): GuildMember[] {
    return [...guild.members].sort((a, b) => b.contributions - a.contributions);
  }

  /** 获取公会总战力 */
  static getGuildPower(guild: Guild): number {
    return guild.members.reduce((sum, m) => sum + m.contributions, 0) + guild.level * 100;
  }

  /** 可用图标列表 */
  static getIcons(): string[] {
    return GUILD_ICONS;
  }

  /** 持久化 */
  static save(guild: Guild): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(guild));
    } catch { /* ignore */ }
  }

  static load(): Guild | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  static clear(): void {
    localStorage.removeItem(STORAGE_KEY);
  }

  static getConfig() {
    return GUILD_CONFIG;
  }
}
