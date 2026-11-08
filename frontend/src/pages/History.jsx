import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, 
  RotateCw, 
  Trash2, 
  FileText, 
  Calendar, 
  Users, 
  Plus, 
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import apiClient from '../api/client';
import StatusBadge from '../components/StatusBadge';

export default function History() {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchMeetings = async (showSpinner = true) => {
    if (showSpinner) setRefreshing(true);
    try {
      const response = await apiClient.get('/meetings');
      setMeetings(response.data.items || []);
    } catch (err) {
      console.error('Failed to load meetings:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMeetings(false);
    // Poll list every 8 seconds for background status updates
    const interval = setInterval(() => {
      fetchMeetings(false);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;
    try {
      await apiClient.delete(`/meetings/${id}`);
      setMeetings(meetings.filter((m) => m.id !== id));
    } catch (err) {
      alert('Failed to delete meeting');
    }
  };

  const handleRetry = async (id) => {
    try {
      await apiClient.post(`/meetings/${id}/retry`);
      fetchMeetings(false);
    } catch (err) {
      alert('Failed to trigger retry');
    }
  };

  const filteredMeetings = meetings.filter((m) =>
    m.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Meeting History & Tasks</h1>
          <p className="text-sm text-slate-500 mt-1">
            Browse your processed meetings, review generated drafts, or retry failed jobs.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => fetchMeetings(true)}
            disabled={refreshing}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 shadow-sm transition"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <Link
            to="/upload"
            className="flex items-center space-x-2 px-4 py-2 bg-brand-700 hover:bg-brand-800 text-white rounded-lg text-sm font-semibold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>New Meeting</span>
          </Link>
        </div>
      </div>

      {/* Filter / Search bar */}
      <div className="mt-6 mb-6">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search meetings by title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-600 focus:outline-none shadow-sm"
          />
        </div>
      </div>

      {/* Table view */}
      {loading ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <RefreshCw className="w-8 h-8 text-brand-700 animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Loading meeting history...</p>
        </div>
      ) : filteredMeetings.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700">No meetings recorded yet</h3>
          <p className="text-xs text-slate-400 mt-1 mb-4">
            Upload your first meeting recording to generate structured minutes.
          </p>
          <Link
            to="/upload"
            className="inline-flex items-center space-x-2 px-4 py-2 bg-brand-700 text-white rounded-lg text-sm font-semibold"
          >
            <Plus className="w-4 h-4" />
            <span>Upload Audio</span>
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider text-left">
              <tr>
                <th className="px-6 py-3.5">Meeting Title</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Date</th>
                <th className="px-6 py-3.5">Audio File</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {filteredMeetings.map((meeting) => (
                <tr key={meeting.id} className="hover:bg-slate-50/70 transition">
                  <td className="px-6 py-4">
                    <Link
                      to={`/meetings/${meeting.id}`}
                      className="font-bold text-navy-900 hover:text-brand-700 flex items-center space-x-2"
                    >
                      <span>{meeting.title}</span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                    </Link>
                    {meeting.participants && meeting.participants.length > 0 && (
                      <div className="flex items-center space-x-1.5 text-xs text-slate-500 mt-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>{meeting.participants.join(', ')}</span>
                      </div>
                    )}
                  </td>

                  <td className="px-6 py-4">
                    <StatusBadge status={meeting.status} />
                  </td>

                  <td className="px-6 py-4 text-xs text-slate-600 font-mono">
                    {meeting.meeting_date}
                  </td>

                  <td className="px-6 py-4 text-xs text-slate-500 font-mono">
                    {meeting.audio_filename || 'Recording'}
                    {meeting.audio_size_bytes && (
                      <span className="block text-[11px] text-slate-400">
                        {(meeting.audio_size_bytes / (1024 * 1024)).toFixed(1)} MB
                      </span>
                    )}
                  </td>

                  <td className="px-6 py-4 text-right space-x-2">
                    {meeting.status === 'failed' && (
                      <button
                        onClick={() => handleRetry(meeting.id)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-300 rounded text-xs font-semibold hover:bg-amber-100"
                        title="Retry processing"
                      >
                        <RotateCw className="w-3 h-3" />
                        <span>Retry</span>
                      </button>
                    )}

                    <Link
                      to={`/meetings/${meeting.id}`}
                      className="inline-flex items-center space-x-1 px-3 py-1 bg-slate-100 hover:bg-brand-50 hover:text-brand-700 text-slate-700 rounded text-xs font-medium border border-slate-300 transition"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>View</span>
                    </Link>

                    <button
                      onClick={() => handleDelete(meeting.id, meeting.title)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                      title="Delete meeting"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
