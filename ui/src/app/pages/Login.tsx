import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = login(username, password);
    if (success) {
      toast.success('Welcome back!');
      navigate('/');
    } else {
      toast.error('Invalid credentials. Password must be at least 4 characters.');
    }
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg border border-gray-300 p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Log In</h1>
            <p className="text-gray-600">
              Demo: Use any username and a password with 4+ characters
            </p>
            <p className="text-sm text-gray-500 mt-2">
              (Use username "admin" or "moderator" for mod access)
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium mb-2">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                placeholder="Enter username"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                placeholder="Enter password"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-orange-500 text-white py-2 rounded-full font-semibold hover:bg-orange-600 transition-colors"
            >
              Log In
            </button>
          </form>

          <div className="mt-6 text-center">
            <span className="text-gray-600">Don't have an account? </span>
            <Link to="/signup" className="text-blue-500 hover:underline font-semibold">
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
