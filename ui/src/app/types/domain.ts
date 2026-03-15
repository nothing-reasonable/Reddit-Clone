export interface Award {
  type: string;
  count: number;
}

export interface Post {
  id: string;
  subreddit: string;
  author: string;
  title: string;
  content: string;
  type: 'text' | 'link' | 'image' | 'poll';
  url?: string;
  upvotes: number;
  downvotes: number;
  commentCount: number;
  createdAt: Date;
  flair?: string;
  flagged?: boolean;
  flagReason?: string;
  removed?: boolean;
  locked?: boolean;
  pinned?: boolean;
  awards?: Award[];
  saved?: boolean;
}

export interface Comment {
  id: string;
  postId: string;
  author: string;
  content: string;
  upvotes: number;
  downvotes: number;
  createdAt: Date;
  parentId?: string;
  flagged?: boolean;
  flagReason?: string;
  removed?: boolean;
}

export interface SubredditRule {
  id: string;
  title: string;
  description: string;
}

export interface Subreddit {
  name: string;
  description: string;
  longDescription: string;
  members: number;
  online: number;
  icon: string;
  banner: string;
  moderators: string[];
  rules: SubredditRule[];
  flairs: string[];
  createdAt: Date;
  isNSFW?: boolean;
}

export interface ModLogEntry {
  id: string;
  subreddit: string;
  moderator: string;
  action: string;
  targetUser?: string;
  targetContent?: string;
  reason?: string;
  timestamp: Date;
}

export interface BannedUser {
  username: string;
  subreddit: string;
  reason: string;
  bannedBy: string;
  bannedAt: Date;
  expiresAt?: Date;
  permanent: boolean;
}

export interface ModMail {
  id: string;
  subreddit: string;
  from: string;
  subject: string;
  content: string;
  timestamp: Date;
  read: boolean;
  replies: { from: string; content: string; timestamp: Date }[];
}

export interface Notification {
  id: string;
  type: string;
  content: string;
  link: string;
  read: boolean;
  timestamp: Date;
}

export interface UserMessage {
  id: string;
  from: string;
  to: string;
  subject: string;
  content: string;
  timestamp: Date;
  read: boolean;
  parentId?: string;
}

export interface WikiPage {
  slug: string;
  title: string;
  content: string;
  lastEditedBy: string;
  lastEditedAt: Date;
  revisions: number;
}
