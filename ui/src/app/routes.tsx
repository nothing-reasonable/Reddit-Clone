import { createBrowserRouter } from 'react-router';
import { Outlet } from 'react-router';
import { Navigate } from 'react-router';
import { AuthProvider } from './contexts/AuthContext';
import { SubredditProvider } from './contexts/SubredditContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import SubredditPage from './pages/SubredditPage';
import PostDetail from './pages/PostDetail';
import CreatePost from './pages/CreatePost';
import UserProfile from './pages/UserProfile';
import ModQueue from './pages/ModQueue';
import AutoModSettings from './pages/AutoModSettings';
import ModTools from './pages/ModTools';
import ModLog from './pages/ModLog';
import BannedUsers from './pages/BannedUsers';
import ModMailPage from './pages/ModMailPage';
import MessagingPage from './pages/MessagingPage';
import SubredditSettings from './pages/SubredditSettings';
import TrafficStats from './pages/TrafficStats';
import SearchResults from './pages/SearchResults';
import NotFound from './pages/NotFound';
import InboxPage from './pages/InboxPage';
import WikiPage from './pages/WikiPage';
import CreateCommunity from './pages/CreateCommunity';
import RouteErrorPage from './pages/RouteErrorPage';

function RootProviders() {
  return (
    <AuthProvider>
      <SubredditProvider>
        <Outlet />
      </SubredditProvider>
    </AuthProvider>
  );
}

export const router = createBrowserRouter([
  {
    element: <RootProviders />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        path: '/',
        element: <Layout />,
        errorElement: <RouteErrorPage />,
        children: [
          { index: true, element: <Home /> },
          { path: 'login', element: <Login /> },
          { path: 'signup', element: <Signup /> },
          { path: 'search', element: <SearchResults /> },
          { path: 'submit', element: <CreatePost /> },
          { path: 'inbox', element: <InboxPage /> },
          { path: 'create-community', element: <CreateCommunity /> },
          { path: 'user/:username', element: <UserProfile /> },
          { path: 'r/:subreddit', element: <SubredditPage /> },
          { path: 'r/:subreddit/wiki', element: <WikiPage /> },
          { path: 'r/:subreddit/wiki/:page', element: <WikiPage /> },
          { path: 'r/:subreddit/comments/:postId', element: <PostDetail /> },
          { path: 'r/:subreddit/mod', element: <ModTools /> },
          { path: 'r/:subreddit/modqueue', element: <ModQueue /> },
          { path: 'r/:subreddit/automod', element: <AutoModSettings /> },
          { path: 'r/:subreddit/mod/log', element: <ModLog /> },
          { path: 'r/:subreddit/mod/banned', element: <BannedUsers /> },
          { path: 'r/:subreddit/modmail', element: <ModMailPage /> },
          { path: 'r/:subreddit/modmai', element: <Navigate to="../modmail" replace /> },
          { path: 'messages', element: <MessagingPage /> },
          { path: 'r/:subreddit/mod/settings', element: <SubredditSettings /> },
          { path: 'r/:subreddit/mod/traffic', element: <TrafficStats /> },
          { path: '*', element: <NotFound /> },
        ],
      },
    ],
  },
]);