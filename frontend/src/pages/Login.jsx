import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, Key, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import apiClient from '../api/client';

export default function Login() {
  const navigate = useNavigate();
  const [useTokenMode, setUseTokenMode] = useState(false);
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (useTokenMode) {
      if (!tokenInput.trim()) {
        setError('Please enter a valid API Secret Token');
        setLoading(false);
        return;
      }
      localStorage.setItem('meetmind_token', tokenInput.trim());
      navigate('/history');
      return;
    }

    try {
      const response = await apiClient.post('/auth/login', {
        username: username,
        password: password,
      });

      localStorage.setItem('meetmind_token', response.data.access_token);
      navigate('/history');
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid login credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex w-14 h-14 rounded-2xl bg-brand-700 items-center justify-center text-white shadow-lg mb-3">
          <Mic className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-extrabold text-navy-900 tracking-tight">MeetMind</h2>
        <p className="mt-1 text-sm text-slate-500 font-medium">Local-First AI Meeting Assistant</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-md rounded-2xl sm:px-10 border border-slate-200">
          <form className="space-y-5" onSubmit={handleLogin}>
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {!useTokenMode ? (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Username
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="mt-1.5 block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-600 focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Enter dashboard password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1.5 block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-600 focus:bg-white transition"
                  />
                </div>
              </>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  API Secret Token
                </label>
                <input
                  type="password"
                  required
                  placeholder="Paste your API_SECRET_TOKEN"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  className="mt-1.5 block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-600 focus:bg-white transition font-mono text-xs"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-lg shadow-sm text-sm font-semibold text-white bg-brand-700 hover:bg-brand-800 focus:ring-4 focus:ring-brand-100 disabled:opacity-50 transition"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Workspace'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <button
              type="button"
              onClick={() => setUseTokenMode(!useTokenMode)}
              className="text-xs text-brand-700 hover:text-brand-900 font-semibold"
            >
              {useTokenMode ? 'Switch to Username & Password' : 'Use Direct API Token Instead'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
