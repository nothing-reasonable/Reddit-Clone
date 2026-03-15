export function getAwardEmoji(type: string): string {
  const awards: Record<string, string> = {
    gold: '🥇',
    silver: '🥈',
    helpful: '🤝',
    wholesome: '💕',
    rocket: '🚀',
    bravo: '👏',
    mindblown: '🤯',
    laughing: '😂',
  };

  return awards[type] || '🏅';
}
