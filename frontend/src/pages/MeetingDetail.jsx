import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Download, 
  RotateCw, 
  Calendar, 
  Users, 
  FileText, 
  ListTree, 
  Terminal, 
  CheckCircle2, 
  AlertCircle,
  FileCheck
} from 'lucide-react';
import apiClient from '../api/client';
import StatusBadge from '../components/StatusBadge';
import ProgressStepper from '../components/ProgressStepper';
import MOMEditor from '../components/MOMEditor';

export default function MeetingDetail() {
  const { id } = useParams();
  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('mom'); // 'mom' | 'transcript' | 'logs'
  const [error, setError] = useState('');

  const fetchMeeting = async (silent = false) => {
    try {
      const response = await apiClient.get(`/meetings/${id}`);
      setMeeting(response.data);
    } catch (err) {
      if (!silent) setError('Failed to load meeting details.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeeting(false);

    // Polling interval if processing is in-flight
    const interval = setInterval(() => {
      if (meeting && ['queued', 'transcribing', 'analysing', 'generating'].includes(meeting.status)) {
        fetchMeeting(true);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [id, meeting?.status]);

  const handleRetry = async () => {
    try {
      await apiClient.post(`/meetings/${id}/retry`);
      fetchMeeting(true);
    } catch (err) {
      alert('Failed to trigger retry');
    }
  };

  const handleDownloadDocx = () => {
    const token = localStorage.getItem('meetmind_token');
    window.open(`/api/meetings/${id}/download/docx?token=${token}`, '_blank');
  };

  const handleDownloadPdf = () => {
    const token = localStorage.getItem('meetmind_token');
    window.open(`/api/meetings/${id}/download/pdf?token=${token}`, '_blank');
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-500">
        <RotateCw className="w-8 h-8 animate-spin mx-auto text-brand-700 mb-3" />
        <p className="text-sm">Loading meeting workspace...</p>
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-800">Meeting Not Found</h2>
        <p className="text-xs text-slate-500 mt-1 mb-4">{error || 'This meeting record does not exist.'}</p>
        <Link to="/history" className="text-brand-700 font-semibold underline text-sm">
          Return to History
        </Link>
      </div>
    );
  }

  const isProcessing = ['queued', 'transcribing', 'analysing', 'generating'].includes(meeting.status);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-4 border-b border-slate-200 gap-4">
        <div className="flex items-start space-x-3">
          <Link
            to="/history"
            className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition mt-0.5"
            title="Back to History"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-navy-900">{meeting.title}</h1>
              <StatusBadge status={meeting.status} />
            </div>
            <div className="flex items-center space-x-4 text-xs text-slate-500 mt-1">
              <span className="flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>{meeting.meeting_date}</span>
              </span>
              {meeting.participants && meeting.participants.length > 0 && (
                <span className="flex items-center space-x-1">
                  <Users className="w-3.5 h-3.5" />
                  <span>{meeting.participants.join(', ')}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          {meeting.status === 'failed' && (
            <button
              onClick={handleRetry}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-semibold shadow-sm transition"
            >
              <RotateCw className="w-4 h-4" />
              <span>Retry Job</span>
            </button>
          )}

          {meeting.docx_path && (
            <button
              onClick={handleDownloadDocx}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-sm font-semibold shadow-sm transition"
            >
              <Download className="w-4 h-4 text-brand-700" />
              <span>Export DOCX</span>
            </button>
          )}

          {meeting.pdf_path && (
            <button
              onClick={handleDownloadPdf}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-brand-700 hover:bg-brand-800 text-white rounded-lg text-sm font-semibold shadow-sm transition"
            >
              <Download className="w-4 h-4" />
              <span>Export PDF</span>
            </button>
          )}
        </div>
      </div>

      {/* Progress Stepper (Shows realtime job progression) */}
      <ProgressStepper currentStatus={meeting.status} error={meeting.error_message} />

      {/* Tab Selectors */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('mom')}
          className={`flex items-center space-x-2 px-5 py-3 border-b-2 text-sm font-semibold transition ${
            activeTab === 'mom'
              ? 'border-brand-700 text-brand-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>Minutes of Meeting (MOM)</span>
        </button>

        <button
          onClick={() => setActiveTab('transcript')}
          className={`flex items-center space-x-2 px-5 py-3 border-b-2 text-sm font-semibold transition ${
            activeTab === 'transcript'
              ? 'border-brand-700 text-brand-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ListTree className="w-4 h-4" />
          <span>Full Transcript</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center space-x-2 px-5 py-3 border-b-2 text-sm font-semibold transition ${
            activeTab === 'logs'
              ? 'border-brand-700 text-brand-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>Processing Logs ({meeting.logs?.length || 0})</span>
        </button>
      </div>

      {/* Tab 1: MOM Editor */}
      {activeTab === 'mom' && (
        <div>
          {isProcessing ? (
            <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
              <RotateCw className="w-8 h-8 text-brand-700 animate-spin mx-auto mb-3" />
              <h3 className="font-bold text-slate-800 text-base">Processing Audio Recording</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Faster-Whisper and Ollama are working in the background. This page will update automatically.
              </p>
            </div>
          ) : (
            <MOMEditor meeting={meeting} onUpdateSuccess={(updated) => setMeeting(updated)} />
          )}
        </div>
      )}

      {/* Tab 2: Transcript with Timestamps */}
      {activeTab === 'transcript' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
          <h2 className="text-lg font-bold text-navy-900 border-b border-slate-200 pb-2">
            Verbatim Audio Transcript
          </h2>
          {meeting.transcript?.segments && meeting.transcript.segments.length > 0 ? (
            <div className="space-y-3 font-sans text-sm">
              {meeting.transcript.segments.map((seg, idx) => (
                <div key={idx} className="flex items-start space-x-3 p-2 hover:bg-slate-50 rounded transition">
                  <span className="font-mono text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded flex-shrink-0 mt-0.5">
                    {Math.floor(seg.start / 60)}:{(seg.start % 60).toFixed(0).padStart(2, '0')} - {Math.floor(seg.end / 60)}:{(seg.end % 60).toFixed(0).padStart(2, '0')}
                  </span>
                  <p className="text-slate-800 leading-relaxed">{seg.text}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 italic">No transcript segments available yet.</p>
          )}
        </div>
      )}

      {/* Tab 3: Processing Logs */}
      {activeTab === 'logs' && (
        <div className="bg-navy-900 rounded-xl shadow-sm border border-slate-800 p-6 font-mono text-xs text-slate-300 space-y-2">
          <h2 className="text-sm font-bold text-white border-b border-slate-700 pb-2 font-sans">
            Worker Pipeline Execution Log
          </h2>
          {meeting.logs && meeting.logs.length > 0 ? (
            <div className="space-y-1.5 mt-2 max-h-96 overflow-y-auto">
              {meeting.logs.map((log) => (
                <div key={log.id} className="flex items-start space-x-2">
                  <span className="text-slate-500">[{new Date(log.created_at).toLocaleTimeString()}]</span>
                  <span className={`uppercase font-bold ${log.level === 'error' ? 'text-rose-400' : log.level === 'warn' ? 'text-amber-400' : 'text-brand-500'}`}>
                    [{log.stage}]
                  </span>
                  <span className="text-slate-200">{log.message}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 italic">No log entries recorded.</p>
          )}
        </div>
      )}
    </div>
  );
}
