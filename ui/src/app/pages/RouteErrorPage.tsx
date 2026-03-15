import { Link, isRouteErrorResponse, useRouteError } from 'react-router';
import { AlertTriangle, Home, RotateCcw } from 'lucide-react';

function extractErrorMessage(error: unknown): string {
  if (isRouteErrorResponse(error)) {
    if (typeof error.data === 'string' && error.data.trim()) {
      return error.data;
    }
    return `${error.status} ${error.statusText || 'Route error'}`;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return 'Something went wrong while loading this page.';
}

export default function RouteErrorPage() {
  const error = useRouteError();
  const message = extractErrorMessage(error);

  return (
    <div className="min-h-[60vh] max-w-3xl mx-auto p-4 flex items-center">
      <div className="w-full bg-white border border-red-200 rounded-xl shadow-sm overflow-hidden">
        <div className="bg-red-50 border-b border-red-100 px-6 py-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <h1 className="text-lg font-bold text-red-700">Unexpected Error</h1>
        </div>

        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-gray-700">
            The page hit an unexpected issue, but the app is still running. You can go back home or try this page again.
          </p>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Details</p>
            <p className="text-sm text-gray-700 break-words">{message}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600"
            >
              <RotateCcw className="w-4 h-4" />
              Try Again
            </button>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50"
            >
              <Home className="w-4 h-4" />
              Go Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
