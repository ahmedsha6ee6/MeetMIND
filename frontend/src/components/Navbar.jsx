import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mic, ListOrdered, Upload, LogOut, CheckCircle2 } from 'lucide-react';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem('meetmind_token');

  const handleLogout = () => {
    localStorage.removeItem('meetmind_token');
    navigate('/login');
  };

  if (!token) return null;

  return (
    <header className="bg-navy-900 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/history" className="flex items-center space-x-3 text-white font-bold text-xl tracking-tight">
          <div className="w-9 h-9 rounded-lg bg-brand-700 flex items-center justify-center text-white shadow">
            <Mic className="w-5 h-5" />
          </div>
          <span>Meet<span className="text-brand-500">Mind</span></span>
          <span className="text-xs px-2 py-0.5 rounded bg-brand-900/60 text-brand-100 font-mono font-normal">v1.0 Local</span>
        </Link>

        <nav className="flex items-center space-x-2">
          <Link
            to="/upload"
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-md text-sm font-medium transition ${
              location.pathname === '/upload'
                ? 'bg-brand-700 text-white'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>New Upload</span>
          </Link>

          <Link
            to="/history"
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-md text-sm font-medium transition ${
              location.pathname === '/history'
                ? 'bg-brand-700 text-white'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <ListOrdered className="w-4 h-4" />
            <span>Meeting History</span>
          </Link>

          <button
            onClick={handleLogout}
            title="Sign out"
            className="flex items-center space-x-1.5 ml-4 px-3 py-2 rounded-md text-sm font-medium text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </nav>
      </div>
    </header>
  );
}
