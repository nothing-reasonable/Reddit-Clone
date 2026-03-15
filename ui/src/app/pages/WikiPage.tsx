import { formatDistanceToNow } from 'date-fns';
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router';
import { getSubredditByName } from '../services/subredditApi';
import type { Subreddit, WikiPage as SubredditWikiPage } from '../types/domain';
import { BookOpen, Clock, Pencil, ChevronRight, FileText, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSubreddit } from '../contexts/SubredditContext';

export default function WikiPage() {
  const { subreddit, page } = useParams<{ subreddit: string; page?: string }>();
  const { user } = useAuth();
  const { isModerator: isSubredditModerator } = useSubreddit();
  const [subredditData, setSubredditData] = useState<Subreddit | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!subreddit) return;

    setIsLoading(true);
    getSubredditByName(subreddit)
      .then((record) => setSubredditData(record))
      .catch(() => setSubredditData(null))
      .finally(() => setIsLoading(false));
  }, [subreddit]);

  const wikiPages: SubredditWikiPage[] = [];
  const currentSlug = page || 'index';
  const currentPage = wikiPages.find((p) => p.slug === currentSlug);
  const isModerator =
    isSubredditModerator(subreddit || '') ||
    (user?.isModerator && subredditData?.moderators.includes(user.username));

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <div className="bg-white border border-gray-300 rounded p-8 text-center text-gray-600">Loading wiki...</div>
      </div>
    );
  }

  if (!subredditData) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <div className="bg-white border border-gray-300 rounded p-8 text-center">
          <h1 className="text-2xl font-bold mb-2">Subreddit not found</h1>
        </div>
      </div>
    );
  }

  // Render markdown-like content
  const renderContent = (content: string) => {
    const lines = content.split('\n');
    const rendered: JSX.Element[] = [];
    let inList = false;
    let listItems: JSX.Element[] = [];

    const flushList = () => {
      if (listItems.length > 0) {
        rendered.push(<ul key={`list-${rendered.length}`} className="list-disc pl-6 space-y-1 my-3">{listItems}</ul>);
        listItems = [];
        inList = false;
      }
    };

    lines.forEach((line, i) => {
      // Headings
      if (line.startsWith('# ')) {
        flushList();
        rendered.push(<h1 key={i} className="text-2xl font-bold mt-6 mb-3 first:mt-0">{processInlineMarkdown(line.slice(2))}</h1>);
      } else if (line.startsWith('## ')) {
        flushList();
        rendered.push(<h2 key={i} className="text-xl font-bold mt-5 mb-2">{processInlineMarkdown(line.slice(3))}</h2>);
      } else if (line.startsWith('### ')) {
        flushList();
        rendered.push(<h3 key={i} className="text-lg font-bold mt-4 mb-1.5">{processInlineMarkdown(line.slice(4))}</h3>);
      }
      // List items
      else if (line.startsWith('- ')) {
        inList = true;
        listItems.push(<li key={i} className="text-sm text-gray-700">{processInlineMarkdown(line.slice(2))}</li>);
      }
      // Numbered list
      else if (/^\d+\.\s/.test(line)) {
        flushList();
        rendered.push(
          <div key={i} className="flex gap-2 my-1 ml-2">
            <span className="font-semibold text-sm text-gray-500 shrink-0">{line.match(/^\d+/)?.[0]}.</span>
            <span className="text-sm text-gray-700">{processInlineMarkdown(line.replace(/^\d+\.\s/, ''))}</span>
          </div>
        );
      }
      // Empty line
      else if (line.trim() === '') {
        flushList();
      }
      // Regular paragraph
      else {
        flushList();
        rendered.push(<p key={i} className="text-sm text-gray-700 my-2">{processInlineMarkdown(line)}</p>);
      }
    });
    flushList();
    return rendered;
  };

  const processInlineMarkdown = (text: string): React.ReactNode => {
    // Process bold, italic, links, and code
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let key = 0;

    while (remaining.length > 0) {
      // Bold
      const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
      // Italic
      const italicMatch = remaining.match(/\*(.+?)\*/);
      // Link
      const linkMatch = remaining.match(/\[(.+?)\]\((.+?)\)/);
      // Inline code
      const codeMatch = remaining.match(/`(.+?)`/);

      const matches = [
        boldMatch && { type: 'bold', match: boldMatch, index: boldMatch.index! },
        italicMatch && !boldMatch?.index?.toString().startsWith(italicMatch.index?.toString() || '') && { type: 'italic', match: italicMatch, index: italicMatch.index! },
        linkMatch && { type: 'link', match: linkMatch, index: linkMatch.index! },
        codeMatch && { type: 'code', match: codeMatch, index: codeMatch.index! },
      ].filter(Boolean).sort((a, b) => a!.index - b!.index);

      if (matches.length === 0) {
        parts.push(remaining);
        break;
      }

      const first = matches[0]!;
      if (first.index > 0) {
        parts.push(remaining.slice(0, first.index));
      }

      if (first.type === 'bold') {
        parts.push(<strong key={key++}>{first.match![1]}</strong>);
        remaining = remaining.slice(first.index + first.match![0].length);
      } else if (first.type === 'italic') {
        parts.push(<em key={key++}>{first.match![1]}</em>);
        remaining = remaining.slice(first.index + first.match![0].length);
      } else if (first.type === 'link') {
        const href = first.match![2];
        const isInternal = href.startsWith('/');
        parts.push(
          isInternal ? (
            <Link key={key++} to={href} className="text-blue-500 hover:underline">{first.match![1]}</Link>
          ) : (
            <a key={key++} href={href} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{first.match![1]}</a>
          )
        );
        remaining = remaining.slice(first.index + first.match![0].length);
      } else if (first.type === 'code') {
        parts.push(<code key={key++} className="px-1.5 py-0.5 bg-gray-100 rounded text-sm font-mono text-red-600">{first.match![1]}</code>);
        remaining = remaining.slice(first.index + first.match![0].length);
      } else {
        parts.push(remaining);
        break;
      }
    }
    return parts;
  };

  // Wiki pages list (sidebar view when no page or index)
  const showPageList = !currentPage && currentSlug !== 'index';

  return (
    <div className="max-w-5xl mx-auto p-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-3 flex-wrap">
        <Link to={`/r/${subreddit}`} className="hover:text-blue-500 hover:underline">r/{subreddit}</Link>
        <ChevronRight className="w-3 h-3" />
        <Link to={`/r/${subreddit}/wiki`} className={`hover:text-blue-500 hover:underline ${currentSlug === 'index' ? 'text-gray-900 font-semibold' : ''}`}>
          Wiki
        </Link>
        {currentSlug !== 'index' && currentPage && (
          <>
            <ChevronRight className="w-3 h-3" />
            <span className="text-gray-900 font-semibold">{currentPage.title}</span>
          </>
        )}
      </div>

      <div className="flex gap-4">
        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {currentPage ? (
            <div className="bg-white border border-gray-300 rounded overflow-hidden">
              {/* Page Header */}
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-blue-500" />
                    <h1 className="text-xl font-bold">{currentPage.title}</h1>
                  </div>
                  {isModerator && (
                    <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200 rounded-full font-medium">
                      <Pencil className="w-3.5 h-3.5" />
                      Edit
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500 mt-2">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Last updated {formatDistanceToNow(currentPage.lastEditedAt, { addSuffix: true })}
                  </span>
                  <span>&middot;</span>
                  <span>by u/{currentPage.lastEditedBy}</span>
                  <span>&middot;</span>
                  <span>{currentPage.revisions} revision{currentPage.revisions !== 1 ? 's' : ''}</span>
                </div>
              </div>

              {/* Page Content */}
              <div className="px-6 py-5">
                {renderContent(currentPage.content)}
              </div>
            </div>
          ) : showPageList ? (
            <div className="bg-white border border-gray-300 rounded p-8 text-center">
              <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h2 className="text-lg font-bold mb-2">Page Not Found</h2>
              <p className="text-gray-500 text-sm mb-4">The wiki page "{currentSlug}" doesn't exist yet.</p>
              <Link to={`/r/${subreddit}/wiki`} className="text-blue-500 hover:underline text-sm">
                &larr; Back to wiki index
              </Link>
            </div>
          ) : (
            <div className="bg-white border border-gray-300 rounded p-8 text-center">
              <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h2 className="text-lg font-bold mb-2">No Wiki</h2>
              <p className="text-gray-500 text-sm">This subreddit doesn't have a wiki yet.</p>
            </div>
          )}
        </div>

        {/* Sidebar - Wiki Pages */}
        <aside className="hidden lg:block w-72 shrink-0">
          <div className="bg-white border border-gray-300 rounded sticky top-16 overflow-hidden">
            <div className="bg-blue-500 px-4 py-3">
              <h2 className="font-bold text-white text-sm flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Wiki Pages
              </h2>
            </div>
            <div className="p-3">
              <div className="space-y-0.5">
                {wikiPages.map((wp) => (
                  <Link
                    key={wp.slug}
                    to={wp.slug === 'index' ? `/r/${subreddit}/wiki` : `/r/${subreddit}/wiki/${wp.slug}`}
                    className={`flex items-center gap-2 px-3 py-2 rounded text-sm hover:bg-gray-100 ${
                      currentSlug === wp.slug ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-700'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{wp.title}</span>
                  </Link>
                ))}
              </div>
              {wikiPages.length === 0 && (
                <p className="text-xs text-gray-400 px-3 py-2">No wiki pages yet.</p>
              )}
            </div>

            {/* Back to subreddit */}
            <div className="border-t border-gray-200 p-3">
              <Link
                to={`/r/${subreddit}`}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to r/{subreddit}
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}