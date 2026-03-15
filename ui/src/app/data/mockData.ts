import type {
  BannedUser,
  Comment,
  ModLogEntry,
  ModMail,
  Notification,
  Post,
  Subreddit,
  UserMessage,
  WikiPage,
} from '../types/domain';
import { formatNumber } from '../utils/format';
import { getAwardEmoji } from '../utils/awards';

export type { Post, Comment, Subreddit, ModLogEntry, BannedUser, ModMail, Notification, UserMessage, WikiPage };

// Production baseline: no seeded sample data.
export const posts: Post[] = [];
export const comments: Comment[] = [];
export const subreddits: Subreddit[] = [];
export const modLogs: ModLogEntry[] = [];
export const bannedUsers: BannedUser[] = [];
export const modMails: ModMail[] = [];
export const notifications: Notification[] = [];
export const userMessages: UserMessage[] = [];
export const subredditWikis: Record<string, WikiPage[]> = {};

export { formatNumber, getAwardEmoji };
