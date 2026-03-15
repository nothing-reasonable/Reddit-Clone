import { getAllSubreddits } from './subredditApi';
import { getGlobalPosts } from './contentApi';
import type { Post, Subreddit } from '../types/domain';

export async function searchCommunities(query: string): Promise<Subreddit[]> {
  const all = await getAllSubreddits();
  const lower = query.toLowerCase();
  return all.filter(
    (s) => s.name.toLowerCase().includes(lower) || s.description.toLowerCase().includes(lower)
  );
}

export async function searchPosts(query: string): Promise<Post[]> {
  const allPosts = await getGlobalPosts('new');
  const lower = query.toLowerCase();
  return allPosts.filter(
    (p) =>
      p.title.toLowerCase().includes(lower) ||
      p.content.toLowerCase().includes(lower) ||
      p.author.toLowerCase().includes(lower)
  );
}
