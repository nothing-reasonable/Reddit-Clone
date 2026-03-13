export interface Post {
  id: string;
  subreddit: string;
  author: string;
  title: string;
  content: string;
  type: 'text' | 'link' | 'image';
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

export interface Award {
  type: 'gold' | 'silver' | 'helpful' | 'wholesome';
  count: number;
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

export interface SubredditRule {
  id: string;
  title: string;
  description: string;
}

export interface AutoModRule {
  id: string;
  subreddit: string;
  name: string;
  enabled: boolean;
  type: 'keyword' | 'karma' | 'account-age' | 'link';
  condition: string;
  action: 'flag' | 'remove' | 'approve';
  reason: string;
}

export interface ModLogEntry {
  id: string;
  subreddit: string;
  moderator: string;
  action: 'remove_post' | 'remove_comment' | 'approve_post' | 'approve_comment' | 'ban_user' | 'unban_user' | 'mute_user' | 'lock_post' | 'pin_post' | 'edit_flair' | 'update_rules';
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
  type: 'comment_reply' | 'post_reply' | 'mention' | 'award' | 'mod_action' | 'upvote_milestone';
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

export const subreddits: Subreddit[] = [
  {
    name: 'programming',
    description: 'Computer Programming',
    longDescription: 'Computer Programming is a community dedicated to all things related to programming. Whether you are just getting started or are a seasoned developer, this is the place for you to share knowledge, ask questions, and discuss the latest trends.',
    members: 7500000,
    online: 12400,
    icon: '💻',
    banner: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=1200',
    moderators: ['admin', 'moderator', 'techmod'],
    rules: [
      { id: 'r1', title: 'No spam or self-promotion', description: 'Do not post promotional content or spam links.' },
      { id: 'r2', title: 'Be respectful', description: 'Treat other members with respect. No personal attacks.' },
      { id: 'r3', title: 'Use descriptive titles', description: 'Post titles should be clear and descriptive.' },
      { id: 'r4', title: 'No low-effort content', description: 'Memes and low-effort posts belong in r/funny.' },
      { id: 'r5', title: 'Tag your posts', description: 'Use appropriate flair tags for your posts.' },
    ],
    flairs: ['Tutorial', 'Discussion', 'Help', 'News', 'Project', 'Meta'],
    createdAt: new Date('2008-01-25'),
  },
  {
    name: 'reactjs',
    description: 'A community for learning and developing with React',
    longDescription: 'The React.js community hub for sharing news, discussing best practices, and helping each other build better React applications. From hooks to server components, everything React lives here.',
    members: 450000,
    online: 3200,
    icon: '⚛️',
    banner: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=1200',
    moderators: ['admin', 'moderator'],
    rules: [
      { id: 'r1', title: 'React-related content only', description: 'Posts must be related to React or its ecosystem.' },
      { id: 'r2', title: 'No duplicate questions', description: 'Search before asking - your question may already be answered.' },
      { id: 'r3', title: 'Include code examples', description: 'When asking for help, provide a minimal reproducible example.' },
    ],
    flairs: ['Discussion', 'Help', 'News', 'Show & Tell', 'Tutorial', 'Meme'],
    createdAt: new Date('2013-05-29'),
  },
  {
    name: 'webdev',
    description: 'Web Development',
    longDescription: 'A community dedicated to all things web development and design. Share your projects, ask for feedback, learn from others, and stay up to date with the latest web technologies.',
    members: 1200000,
    online: 8900,
    icon: '🌐',
    banner: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1200',
    moderators: ['moderator'],
    rules: [
      { id: 'r1', title: 'Be constructive', description: 'Provide constructive feedback, not just criticism.' },
      { id: 'r2', title: 'No job postings', description: 'Use dedicated job boards for posting positions.' },
      { id: 'r3', title: 'Share knowledge', description: 'When possible, share what you have learned.' },
    ],
    flairs: ['Tips', 'Discussion', 'Showoff Saturday', 'Help', 'Resource', 'Question'],
    createdAt: new Date('2008-06-15'),
  },
  {
    name: 'funny',
    description: 'Funny memes and jokes',
    longDescription: 'The funniest community on Reddit! Share your best memes, jokes, and humorous content. Keep it lighthearted and fun for everyone.',
    members: 42000000,
    online: 156000,
    icon: '😂',
    banner: 'https://images.unsplash.com/photo-1533147670608-2a2f9775d3a4?w=1200',
    moderators: ['admin'],
    rules: [
      { id: 'r1', title: 'Must be funny', description: 'Content should actually be humorous.' },
      { id: 'r2', title: 'No politics', description: 'Keep political content out of this sub.' },
      { id: 'r3', title: 'No reposts within 2 weeks', description: 'Check if your content has been posted recently.' },
    ],
    flairs: ['Meme', 'Gif', 'Video', 'Story', 'Meta'],
    createdAt: new Date('2008-01-25'),
  },
  {
    name: 'gaming',
    description: 'Gaming news and discussion',
    longDescription: 'A subreddit for informative and interesting gaming content and discussions. Share your gaming experiences, news, reviews, and connect with fellow gamers.',
    members: 35000000,
    online: 98000,
    icon: '🎮',
    banner: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1200',
    moderators: ['admin', 'gamemod'],
    rules: [
      { id: 'r1', title: 'No piracy', description: 'Do not share or request pirated content.' },
      { id: 'r2', title: 'Mark spoilers', description: 'Use spoiler tags for any story spoilers.' },
      { id: 'r3', title: 'No hate speech', description: 'Keep discussions civil and respectful.' },
      { id: 'r4', title: 'Original content encouraged', description: 'Give credit to original creators.' },
    ],
    flairs: ['Achievement', 'Discussion', 'News', 'Screenshot', 'Meme', 'Review'],
    createdAt: new Date('2008-03-12'),
  },
];

export const posts: Post[] = [
  {
    id: 'post-1',
    subreddit: 'programming',
    author: 'codeMaster99',
    title: 'How to optimize React performance in large applications',
    content: 'I\'ve been working on a large React application with 100+ components and noticed performance issues. Here are some tips:\n\n1) Use React.memo for expensive components\n2) Implement code splitting with React.lazy\n3) Optimize re-renders with useMemo and useCallback\n4) Use virtualization for long lists\n5) Profile with React DevTools\n\nWhat other tips do you have?',
    type: 'text',
    upvotes: 1547,
    downvotes: 23,
    commentCount: 89,
    createdAt: new Date('2026-02-25T10:30:00'),
    flair: 'Tutorial',
    awards: [{ type: 'gold', count: 2 }, { type: 'helpful', count: 5 }],
  },
  {
    id: 'post-2',
    subreddit: 'reactjs',
    author: 'reactFan2024',
    title: 'React 19 is amazing! Here\'s what I love about it',
    content: 'Just upgraded to React 19 and the new features are incredible. The built-in suspense improvements and automatic batching make everything so much smoother. Server components are game-changing for our SSR setup.\n\nHas anyone else tried it yet? What are your favorite new features?',
    type: 'text',
    upvotes: 892,
    downvotes: 15,
    commentCount: 54,
    createdAt: new Date('2026-02-24T15:45:00'),
    flair: 'Discussion',
    awards: [{ type: 'wholesome', count: 1 }],
  },
  {
    id: 'post-3',
    subreddit: 'webdev',
    author: 'designGuru',
    title: 'CSS Grid vs Flexbox: When to use which?',
    content: 'I see a lot of confusion about when to use CSS Grid vs Flexbox. Here\'s my rule of thumb:\n\n**Use Flexbox for:**\n- One-dimensional layouts (rows OR columns)\n- Navigation bars\n- Centering elements\n\n**Use Grid for:**\n- Two-dimensional layouts (rows AND columns)\n- Complex page layouts\n- Card grids\n\nWhat do you all think? Any exceptions?',
    type: 'text',
    upvotes: 2341,
    downvotes: 87,
    commentCount: 156,
    createdAt: new Date('2026-02-24T09:15:00'),
    flair: 'Tips',
    awards: [{ type: 'gold', count: 1 }, { type: 'silver', count: 3 }, { type: 'helpful', count: 8 }],
  },
  {
    id: 'post-4',
    subreddit: 'programming',
    author: 'spamBot123',
    title: 'CLICK HERE FOR FREE BITCOIN!!!',
    content: 'Amazing opportunity to earn free cryptocurrency! Visit this suspicious link now!!!',
    type: 'text',
    upvotes: 2,
    downvotes: 145,
    commentCount: 3,
    createdAt: new Date('2026-02-26T08:00:00'),
    flair: 'Spam',
    flagged: true,
    flagReason: 'Spam detected - suspicious links',
  },
  {
    id: 'post-5',
    subreddit: 'funny',
    author: 'memeLord420',
    title: 'When your code works but you don\'t know why',
    content: '🤔 *stares at screen confused*\n\n> git commit -m "it works, don\'t touch it"\n\nEvery developer has been there. That moment when you write something at 2am, fall asleep, and wake up to find it actually compiles and runs perfectly. You\'re afraid to even look at it too closely.',
    type: 'text',
    upvotes: 15420,
    downvotes: 234,
    commentCount: 432,
    createdAt: new Date('2026-02-25T18:20:00'),
    flair: 'Meme',
    awards: [{ type: 'gold', count: 5 }, { type: 'wholesome', count: 12 }, { type: 'silver', count: 8 }],
  },
  {
    id: 'post-6',
    subreddit: 'gaming',
    author: 'gamerPro',
    title: 'Just finished Elden Ring after 200 hours!',
    content: 'What an incredible journey. The boss fights were challenging but fair, and the world design is phenomenal. Margit was my first wall, but Malenia... oh Malenia. Took me 47 attempts.\n\nHighly recommend to anyone who hasn\'t played it yet. The DLC is even better!',
    type: 'text',
    upvotes: 3421,
    downvotes: 89,
    commentCount: 287,
    createdAt: new Date('2026-02-25T20:10:00'),
    flair: 'Achievement',
    awards: [{ type: 'gold', count: 1 }, { type: 'wholesome', count: 3 }],
  },
  {
    id: 'post-7',
    subreddit: 'reactjs',
    author: 'newbieDev',
    title: 'Help: Understanding useEffect dependencies',
    content: 'I\'m new to React and confused about useEffect dependencies. When should I include something in the dependency array? I keep getting lint warnings about missing dependencies but adding everything causes infinite loops.\n\nHere\'s my code:\n```\nuseEffect(() => {\n  fetchData(userId);\n}, []);\n```\n\nThe linter says I should add userId and fetchData. Help?',
    type: 'text',
    upvotes: 234,
    downvotes: 8,
    commentCount: 45,
    createdAt: new Date('2026-02-26T07:30:00'),
    flair: 'Help',
  },
  {
    id: 'post-8',
    subreddit: 'programming',
    author: 'BadActor99',
    title: 'You all suck at coding',
    content: 'This is offensive content that violates community guidelines and should be flagged by automod.',
    type: 'text',
    upvotes: 0,
    downvotes: 67,
    commentCount: 12,
    createdAt: new Date('2026-02-26T06:45:00'),
    flagged: true,
    flagReason: 'Toxic language detected',
  },
  {
    id: 'post-9',
    subreddit: 'programming',
    author: 'rustEnthusiast',
    title: 'Why Rust is becoming my go-to language for backend development',
    content: 'After 2 years of writing production Rust, I can confidently say it has changed how I think about software. The ownership model catches so many bugs at compile time that would be runtime errors in other languages.\n\nPerformance is incredible - our API server handles 10x the throughput compared to our old Node.js implementation with 1/4 the memory usage.\n\nThe ecosystem has matured significantly. Tokio, Axum, and SQLx make web development quite pleasant.',
    type: 'text',
    upvotes: 987,
    downvotes: 156,
    commentCount: 234,
    createdAt: new Date('2026-02-25T14:00:00'),
    flair: 'Discussion',
    awards: [{ type: 'silver', count: 2 }],
  },
  {
    id: 'post-10',
    subreddit: 'webdev',
    author: 'fullstackDev',
    title: 'I built a full-stack app in a weekend using Astro + HTMX',
    content: 'Wanted to share my experience building a complete task management app using Astro for SSG/SSR and HTMX for interactivity. Zero JavaScript framework on the client!\n\nThe result: A snappy, accessible app that scores 100 on all Lighthouse metrics. The total JS sent to the client is under 15KB.\n\nRepo link in comments. Would love feedback!',
    type: 'text',
    upvotes: 1876,
    downvotes: 45,
    commentCount: 198,
    createdAt: new Date('2026-02-24T22:00:00'),
    flair: 'Showoff Saturday',
    awards: [{ type: 'gold', count: 3 }, { type: 'helpful', count: 2 }],
  },
  {
    id: 'post-11',
    subreddit: 'gaming',
    author: 'nintendoFan',
    title: 'The new Zelda announcement has me hyped beyond belief',
    content: 'Nintendo just dropped the trailer for the next Zelda game and it looks absolutely stunning. The art direction is a completely new style, almost painterly. Open world again but with what looks like a much deeper crafting system.\n\nRelease date: Holiday 2026. Who else is counting down the days?',
    type: 'text',
    upvotes: 8934,
    downvotes: 312,
    commentCount: 567,
    createdAt: new Date('2026-02-25T16:30:00'),
    flair: 'News',
    awards: [{ type: 'gold', count: 8 }, { type: 'wholesome', count: 15 }],
  },
  {
    id: 'post-12',
    subreddit: 'funny',
    author: 'officeHumor',
    title: 'My cat decided to "help" with my code review today',
    content: 'Came back from getting coffee to find my cat sitting on my keyboard. She had somehow managed to approve 3 pull requests, reject 2, and left a comment that just says "aaaaaaaaaaaaa".\n\nBest code reviewer on the team honestly. Her approval rate is better than most humans.',
    type: 'text',
    upvotes: 24500,
    downvotes: 180,
    commentCount: 891,
    createdAt: new Date('2026-02-26T09:00:00'),
    flair: 'Story',
    awards: [{ type: 'gold', count: 12 }, { type: 'wholesome', count: 45 }, { type: 'silver', count: 20 }],
  },
  {
    id: 'post-13',
    subreddit: 'reactjs',
    author: 'hooksMaster',
    title: 'Custom hooks that have saved me thousands of lines of code',
    content: 'Over the past year I\'ve built a collection of custom hooks that I use in every project. Here are my favorites:\n\n1. useLocalStorage - Persist state to localStorage\n2. useDebounce - Debounce any value\n3. useMediaQuery - Responsive design in JS\n4. useOnClickOutside - Detect clicks outside a ref\n5. usePrevious - Access the previous value of a state\n\nFull implementations with TypeScript in the comments!',
    type: 'text',
    upvotes: 1245,
    downvotes: 34,
    commentCount: 87,
    createdAt: new Date('2026-02-25T08:00:00'),
    flair: 'Tutorial',
    awards: [{ type: 'helpful', count: 12 }, { type: 'gold', count: 1 }],
  },
];

export const comments: Comment[] = [
  {
    id: 'comment-1',
    postId: 'post-1',
    author: 'reactExpert',
    content: 'Great tips! I\'d also add using virtualization for long lists with libraries like react-window. We reduced our initial render time by 80% just by virtualizing a list of 10,000 items.',
    upvotes: 234,
    downvotes: 3,
    createdAt: new Date('2026-02-25T11:00:00'),
  },
  {
    id: 'comment-2',
    postId: 'post-1',
    author: 'devNewbie',
    content: 'Thanks for sharing! This is really helpful for my current project. I\'ve been struggling with performance on a dashboard that renders 50+ charts.',
    upvotes: 45,
    downvotes: 1,
    createdAt: new Date('2026-02-25T11:30:00'),
  },
  {
    id: 'comment-3',
    postId: 'post-1',
    author: 'performanceGuy',
    content: 'Don\'t forget about React DevTools Profiler! It\'s essential for finding performance bottlenecks. I wrote a guide on using it effectively: look for the "flamegraph" tab and filter by commit duration.',
    upvotes: 156,
    downvotes: 2,
    createdAt: new Date('2026-02-25T12:15:00'),
    parentId: 'comment-1',
  },
  {
    id: 'comment-4',
    postId: 'post-2',
    author: 'oldSchoolDev',
    content: 'Still on React 17 here. Is the upgrade difficult? We have a huge codebase with lots of class components and lifecycle methods.',
    upvotes: 67,
    downvotes: 2,
    createdAt: new Date('2026-02-24T16:00:00'),
  },
  {
    id: 'comment-5',
    postId: 'post-2',
    author: 'reactFan2024',
    content: 'Not too bad! Most of my code worked without changes. Just had to update a few deprecated patterns. The codemod tool from the React team handles most of it automatically.',
    upvotes: 89,
    downvotes: 1,
    createdAt: new Date('2026-02-24T16:30:00'),
    parentId: 'comment-4',
  },
  {
    id: 'comment-6',
    postId: 'post-3',
    author: 'cssNinja',
    content: 'Exactly! I use Flexbox for navigation bars and sidebars, Grid for the main layout structure. One thing I\'d add: Grid is also amazing for overlapping elements with grid-area.',
    upvotes: 345,
    downvotes: 12,
    createdAt: new Date('2026-02-24T10:00:00'),
  },
  {
    id: 'comment-7',
    postId: 'post-7',
    author: 'reactMentor',
    content: 'The dependency array tells React when to re-run the effect. Include any value from the component scope that changes over time and is used inside the effect.\n\nFor your case, wrap fetchData in useCallback:\n```\nconst fetchData = useCallback(async (id) => {\n  // fetch logic\n}, []);\n\nuseEffect(() => {\n  fetchData(userId);\n}, [fetchData, userId]);\n```',
    upvotes: 89,
    downvotes: 2,
    createdAt: new Date('2026-02-26T08:00:00'),
  },
  {
    id: 'comment-8',
    postId: 'post-7',
    author: 'helpfulDev',
    content: 'Check out the React docs on useEffect, they have great examples: https://react.dev/reference/react/useEffect\n\nThe key insight is: effects "synchronize" your component with an external system.',
    upvotes: 45,
    downvotes: 1,
    createdAt: new Date('2026-02-26T08:15:00'),
  },
  {
    id: 'comment-9',
    postId: 'post-5',
    author: 'debugKing',
    content: 'The worst part is when you try to "clean it up" and it breaks. Now you have to figure out what magic made it work in the first place. 😂',
    upvotes: 567,
    downvotes: 5,
    createdAt: new Date('2026-02-25T19:00:00'),
  },
  {
    id: 'comment-10',
    postId: 'post-5',
    author: 'seniorDev2026',
    content: 'After 15 years of programming, I\'ve learned that "it works, don\'t touch it" is sometimes the most pragmatic advice. Technical debt is real, but so are deadlines.',
    upvotes: 890,
    downvotes: 23,
    createdAt: new Date('2026-02-25T19:30:00'),
  },
  {
    id: 'comment-11',
    postId: 'post-6',
    author: 'soulsVeteran',
    content: 'Only 47 attempts on Malenia? Those are rookie numbers! She took me 100+. But that feeling when you finally beat her... chef\'s kiss.',
    upvotes: 234,
    downvotes: 4,
    createdAt: new Date('2026-02-25T21:00:00'),
  },
  {
    id: 'comment-12',
    postId: 'post-9',
    author: 'goDeveloper',
    content: 'Interesting take. I\'ve been using Go for similar reasons. How does Rust compare in terms of developer productivity? The learning curve for the borrow checker seems steep.',
    upvotes: 78,
    downvotes: 5,
    createdAt: new Date('2026-02-25T15:00:00'),
  },
  {
    id: 'comment-13',
    postId: 'post-12',
    author: 'catLover99',
    content: 'This is amazing. My cat once managed to deploy to production. We now call it "catastrophic deployment".',
    upvotes: 1234,
    downvotes: 8,
    createdAt: new Date('2026-02-26T09:30:00'),
  },
  {
    id: 'comment-14',
    postId: 'post-12',
    author: 'dogPerson',
    content: 'Meanwhile, my dog just ate my USB drive with the only copy of my thesis on it. Dogs > cats at data destruction.',
    upvotes: 567,
    downvotes: 45,
    createdAt: new Date('2026-02-26T10:00:00'),
    parentId: 'comment-13',
  },
];

export const autoModRules: AutoModRule[] = [
  {
    id: 'rule-1',
    subreddit: 'programming',
    name: 'Spam Filter',
    enabled: true,
    type: 'keyword',
    condition: 'FREE BITCOIN, CLICK HERE, AMAZING OPPORTUNITY',
    action: 'flag',
    reason: 'Spam detected - suspicious links',
  },
  {
    id: 'rule-2',
    subreddit: 'programming',
    name: 'Toxic Language',
    enabled: true,
    type: 'keyword',
    condition: 'suck, terrible, horrible, offensive',
    action: 'flag',
    reason: 'Toxic language detected',
  },
  {
    id: 'rule-3',
    subreddit: 'reactjs',
    name: 'Low Karma Filter',
    enabled: true,
    type: 'karma',
    condition: '< 10',
    action: 'flag',
    reason: 'New user - manual review required',
  },
  {
    id: 'rule-4',
    subreddit: 'webdev',
    name: 'New Account Filter',
    enabled: true,
    type: 'account-age',
    condition: '< 7 days',
    action: 'flag',
    reason: 'Account too new',
  },
  {
    id: 'rule-5',
    subreddit: 'funny',
    name: 'External Link Review',
    enabled: false,
    type: 'link',
    condition: 'external domain',
    action: 'flag',
    reason: 'External link requires review',
  },
];

export const modLogs: ModLogEntry[] = [
  {
    id: 'log-1',
    subreddit: 'programming',
    moderator: 'admin',
    action: 'remove_post',
    targetUser: 'spamBot123',
    targetContent: 'CLICK HERE FOR FREE BITCOIN!!!',
    reason: 'Spam',
    timestamp: new Date('2026-02-26T08:05:00'),
  },
  {
    id: 'log-2',
    subreddit: 'programming',
    moderator: 'moderator',
    action: 'ban_user',
    targetUser: 'spamBot123',
    reason: 'Spam bot - permanent ban',
    timestamp: new Date('2026-02-26T08:10:00'),
  },
  {
    id: 'log-3',
    subreddit: 'programming',
    moderator: 'admin',
    action: 'approve_post',
    targetUser: 'codeMaster99',
    targetContent: 'How to optimize React performance in large applications',
    reason: 'Quality content',
    timestamp: new Date('2026-02-25T11:00:00'),
  },
  {
    id: 'log-4',
    subreddit: 'programming',
    moderator: 'techmod',
    action: 'lock_post',
    targetUser: 'BadActor99',
    targetContent: 'You all suck at coding',
    reason: 'Toxic content - locked for review',
    timestamp: new Date('2026-02-26T07:00:00'),
  },
  {
    id: 'log-5',
    subreddit: 'programming',
    moderator: 'admin',
    action: 'pin_post',
    targetUser: 'codeMaster99',
    targetContent: 'How to optimize React performance in large applications',
    reason: 'Valuable community resource',
    timestamp: new Date('2026-02-25T12:00:00'),
  },
  {
    id: 'log-6',
    subreddit: 'reactjs',
    moderator: 'moderator',
    action: 'approve_comment',
    targetUser: 'reactMentor',
    targetContent: 'The dependency array tells React when...',
    timestamp: new Date('2026-02-26T08:30:00'),
  },
  {
    id: 'log-7',
    subreddit: 'programming',
    moderator: 'moderator',
    action: 'mute_user',
    targetUser: 'BadActor99',
    reason: 'Repeated violations',
    timestamp: new Date('2026-02-26T07:30:00'),
  },
];

export const bannedUsers: BannedUser[] = [
  {
    username: 'spamBot123',
    subreddit: 'programming',
    reason: 'Spam bot - posting crypto scam links',
    bannedBy: 'moderator',
    bannedAt: new Date('2026-02-26T08:10:00'),
    permanent: true,
  },
  {
    username: 'BadActor99',
    subreddit: 'programming',
    reason: 'Repeated toxic behavior and personal attacks',
    bannedBy: 'admin',
    bannedAt: new Date('2026-02-26T07:00:00'),
    expiresAt: new Date('2026-03-26T07:00:00'),
    permanent: false,
  },
];

export const modMails: ModMail[] = [
  {
    id: 'mm-1',
    subreddit: 'programming',
    from: 'newbieDev',
    subject: 'My post was removed unfairly',
    content: 'Hi mods, my post about JavaScript frameworks was removed but I don\'t think it violated any rules. Can you please review it?',
    timestamp: new Date('2026-02-25T14:00:00'),
    read: false,
    replies: [
      {
        from: 'moderator',
        content: 'Hi, thanks for reaching out. I\'ll take a look at your post and get back to you.',
        timestamp: new Date('2026-02-25T15:00:00'),
      },
    ],
  },
  {
    id: 'mm-2',
    subreddit: 'programming',
    from: 'helpfulDev',
    subject: 'Reporting a user for harassment',
    content: 'User BadActor99 has been harassing me in the comments. They\'ve made personal attacks on multiple posts. Please take action.',
    timestamp: new Date('2026-02-26T06:00:00'),
    read: true,
    replies: [
      {
        from: 'admin',
        content: 'Thank you for reporting this. We\'ve reviewed the user\'s history and have taken appropriate action. The user has been temporarily banned.',
        timestamp: new Date('2026-02-26T07:00:00'),
      },
    ],
  },
  {
    id: 'mm-3',
    subreddit: 'reactjs',
    from: 'hooksMaster',
    subject: 'Can I become a moderator?',
    content: 'I\'ve been an active member of this community for over a year and would love to help moderate. I\'m available most evenings and weekends.',
    timestamp: new Date('2026-02-24T10:00:00'),
    read: true,
    replies: [],
  },
];

export const notifications: Notification[] = [
  {
    id: 'notif-1',
    type: 'comment_reply',
    content: 'reactExpert replied to your post "How to optimize React performance..."',
    link: '/r/programming/comments/post-1',
    read: false,
    timestamp: new Date('2026-02-25T11:00:00'),
  },
  {
    id: 'notif-2',
    type: 'award',
    content: 'Your post received a Gold Award!',
    link: '/r/programming/comments/post-1',
    read: false,
    timestamp: new Date('2026-02-25T12:00:00'),
  },
  {
    id: 'notif-3',
    type: 'upvote_milestone',
    content: 'Your post hit 1,000 upvotes!',
    link: '/r/programming/comments/post-1',
    read: true,
    timestamp: new Date('2026-02-25T15:00:00'),
  },
  {
    id: 'notif-4',
    type: 'mod_action',
    content: 'New item in mod queue for r/programming',
    link: '/r/programming/modqueue',
    read: false,
    timestamp: new Date('2026-02-26T08:00:00'),
  },
  {
    id: 'notif-5',
    type: 'mention',
    content: 'codeMaster99 mentioned you in a comment',
    link: '/r/programming/comments/post-1',
    read: true,
    timestamp: new Date('2026-02-25T13:00:00'),
  },
];

export const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k';
  }
  return num.toString();
};

export const getAwardEmoji = (type: string) => {
  switch (type) {
    case 'gold': return '🥇';
    case 'silver': return '🥈';
    case 'helpful': return '🤝';
    case 'wholesome': return '💕';
    default: return '⭐';
  }
};

export const userMessages: UserMessage[] = [
  {
    id: 'dm-1',
    from: 'codeMaster99',
    to: 'admin',
    subject: 'Thanks for the help!',
    content: 'Hey, just wanted to say thanks for answering my question about React hooks in the programming sub. Really helped me understand the concept better!',
    timestamp: new Date('2026-02-26T10:00:00'),
    read: false,
  },
  {
    id: 'dm-2',
    from: 'admin',
    to: 'codeMaster99',
    subject: 're: Thanks for the help!',
    content: 'No problem at all! Happy to help. Feel free to reach out if you have more questions.',
    timestamp: new Date('2026-02-26T10:30:00'),
    read: true,
    parentId: 'dm-1',
  },
  {
    id: 'dm-3',
    from: 'reactFan2024',
    to: 'admin',
    subject: 'Collaboration on a project?',
    content: 'Hi there! I saw your posts on r/reactjs and was wondering if you\'d be interested in collaborating on an open-source React component library? I have some designs ready and could use help with the implementation.',
    timestamp: new Date('2026-02-25T18:00:00'),
    read: false,
  },
  {
    id: 'dm-4',
    from: 'hooksMaster',
    to: 'admin',
    subject: 'Custom hooks collection',
    content: 'Hey! I noticed you\'re into React performance. I\'ve been building a collection of custom hooks optimized for performance. Would you be interested in reviewing some of them before I publish?',
    timestamp: new Date('2026-02-24T09:00:00'),
    read: true,
  },
  {
    id: 'dm-5',
    from: 'admin',
    to: 'hooksMaster',
    subject: 're: Custom hooks collection',
    content: 'That sounds great! I\'d love to take a look. Can you share the repo link? I can probably give feedback this weekend.',
    timestamp: new Date('2026-02-24T11:00:00'),
    read: true,
    parentId: 'dm-4',
  },
  {
    id: 'dm-6',
    from: 'designGuru',
    to: 'admin',
    subject: 'CSS Grid article feedback',
    content: 'Thanks for the feedback on my CSS Grid vs Flexbox post! You raised some good points about container queries. Mind if I quote you in a follow-up article?',
    timestamp: new Date('2026-02-25T08:00:00'),
    read: true,
  },
  {
    id: 'dm-7',
    from: 'gamerPro',
    to: 'admin',
    subject: 'Gaming meetup',
    content: 'Hey, a few of us from r/gaming are planning a virtual game night this Saturday. Want to join? We\'ll be playing some co-op games.',
    timestamp: new Date('2026-02-26T14:00:00'),
    read: false,
  },
];

export const subredditWikis: Record<string, WikiPage[]> = {
  programming: [
    {
      slug: 'index',
      title: 'r/programming Wiki',
      content: `# Welcome to r/programming

Welcome to the r/programming wiki! This is a community-maintained resource for programmers of all skill levels.

## Getting Started

If you're new to programming, check out these resources:

- **[FAQ](/r/programming/wiki/faq)** - Frequently asked questions
- **[Learning Resources](/r/programming/wiki/resources)** - Curated list of learning materials
- **[Rules & Guidelines](/r/programming/wiki/rules)** - Community rules explained in detail

## What This Subreddit Is About

r/programming is a reddit for discussion and news about computer programming. It is not a place for questions about how to write code - for that, use r/learnprogramming.

## Quick Links

- How to ask a good question
- Contributing to the wiki
- List of related subreddits
- Annual community survey results`,
      lastEditedBy: 'admin',
      lastEditedAt: new Date('2026-02-20T10:00:00'),
      revisions: 24,
    },
    {
      slug: 'faq',
      title: 'Frequently Asked Questions',
      content: `# Frequently Asked Questions

## General

**Q: What programming language should I learn first?**
A: It depends on your goals. Python is great for beginners, JavaScript for web development, and C++ for systems programming. See our [resources page](/r/programming/wiki/resources) for more guidance.

**Q: How do I get started with open source?**
A: Look for issues tagged "good first issue" on GitHub. Start small, read the contribution guidelines, and don't be afraid to ask questions.

**Q: Is a CS degree necessary?**
A: No, but it helps. Many successful programmers are self-taught. What matters most is your portfolio and ability to solve problems.

## Subreddit-Specific

**Q: Why was my post removed?**
A: Posts are removed if they violate our rules. Common reasons include: off-topic content, spam, or asking basic how-to questions (use r/learnprogramming instead).

**Q: How do I get post flair?**
A: Select a flair when creating your post. Moderators may also assign flair to categorize content.

**Q: Can I promote my project/tool/library?**
A: Self-promotion is allowed within reason. Follow the 9:1 rule - for every self-promotional post, you should have 9 non-promotional contributions.`,
      lastEditedBy: 'moderator',
      lastEditedAt: new Date('2026-02-18T14:00:00'),
      revisions: 12,
    },
    {
      slug: 'resources',
      title: 'Learning Resources',
      content: `# Learning Resources

## Free Online Courses
- **freeCodeCamp** - Full-stack web development curriculum
- **The Odin Project** - Web development fundamentals
- **CS50** - Harvard's intro to computer science
- **MIT OpenCourseWare** - University-level CS courses

## Books
- *Clean Code* by Robert C. Martin
- *The Pragmatic Programmer* by Hunt & Thomas
- *Design Patterns* by the Gang of Four
- *Introduction to Algorithms* (CLRS)

## Practice Platforms
- **LeetCode** - Algorithm practice & interview prep
- **HackerRank** - Coding challenges
- **Exercism** - Mentored code practice
- **Project Euler** - Mathematical programming challenges

## YouTube Channels
- Fireship - Quick tech overviews
- Traversy Media - Web development tutorials
- Ben Awad - React and GraphQL content
- ThePrimeagen - Performance and Vim tips

## Podcasts
- Syntax.fm - Web development
- Software Engineering Daily
- Talk Python To Me`,
      lastEditedBy: 'techmod',
      lastEditedAt: new Date('2026-02-22T16:00:00'),
      revisions: 31,
    },
  ],
  reactjs: [
    {
      slug: 'index',
      title: 'r/reactjs Wiki',
      content: `# Welcome to r/reactjs Wiki

Your one-stop resource for everything React!

## Quick Start Guide

New to React? Start here:
1. Read the [official React docs](https://react.dev)
2. Complete the official tutorial
3. Build a small project
4. Share it with the community!

## Common Patterns

- **State Management** - Context API, Redux, Zustand, Jotai
- **Data Fetching** - React Query, SWR, RTK Query
- **Styling** - CSS Modules, Tailwind CSS, styled-components
- **Routing** - React Router, TanStack Router

## Rules Summary

1. All posts must be related to React
2. Search before posting questions
3. Include code examples when asking for help
4. Be kind and constructive`,
      lastEditedBy: 'moderator',
      lastEditedAt: new Date('2026-02-19T12:00:00'),
      revisions: 15,
    },
  ],
  webdev: [
    {
      slug: 'index',
      title: 'r/webdev Wiki',
      content: `# r/webdev Community Wiki

## Welcome!

This wiki is maintained by the r/webdev community. Feel free to contribute!

## Recommended Tools

### Code Editors
- VS Code (most popular)
- WebStorm (JetBrains)
- Neovim (for the adventurous)

### Design Tools
- Figma
- Adobe XD

### DevOps & Hosting
- Vercel
- Netlify
- AWS
- Cloudflare Pages

## Career Resources

- Building your portfolio
- Preparing for interviews
- Freelancing tips
- Salary negotiation guides`,
      lastEditedBy: 'moderator',
      lastEditedAt: new Date('2026-02-21T09:00:00'),
      revisions: 18,
    },
  ],
  funny: [
    {
      slug: 'index',
      title: 'r/funny Wiki',
      content: `# r/funny Wiki

## Rules Explained

1. **Must be funny** - This should be obvious! If it doesn't make people laugh, it probably doesn't belong here.
2. **No politics** - There are other subs for that.
3. **No reposts** - Check before posting!

## Hall of Fame

Check out the top posts of all time for some legendary laughs.

## Flair Guide

- **Meme** - Image macros and meme formats
- **Gif** - Animated content
- **Video** - Video posts
- **Story** - Text-based humor
- **Meta** - About the subreddit itself`,
      lastEditedBy: 'admin',
      lastEditedAt: new Date('2026-02-15T10:00:00'),
      revisions: 8,
    },
  ],
  gaming: [
    {
      slug: 'index',
      title: 'r/gaming Wiki',
      content: `# r/gaming Community Wiki

## Welcome Gamers!

This is your resource hub for all things gaming on r/gaming.

## Community Events

- **Screenshot Saturday** - Share your best gaming screenshots
- **What Are You Playing Wednesday** - Weekly discussion thread
- **Free Game Friday** - Share free game deals

## Platform Guides

### PC Gaming
- Building your first PC
- Recommended specs for popular games
- Best free-to-play games

### Console Gaming
- PlayStation exclusives guide
- Xbox Game Pass recommendations
- Nintendo Switch hidden gems

## Rules Quick Reference

1. No piracy or links to pirated content
2. Mark spoilers appropriately
3. Be respectful to fellow gamers
4. Credit original creators`,
      lastEditedBy: 'admin',
      lastEditedAt: new Date('2026-02-17T14:00:00'),
      revisions: 22,
    },
  ],
};