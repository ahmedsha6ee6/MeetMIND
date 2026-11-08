import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { 
  UploadCloud, 
  FileAudio, 
  AlertCircle, 
  CheckCircle2, 
  Users, 
  Calendar, 
  FileText,
  Loader2
} from 'lucide-react';
import apiClient from '../api/client';

const MAX_SIZE_BYTES = 500 * 1024 * 1024; // 500 MB (F3 fix)

export default function Upload() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().split('T')[0]);
  const [participants, setParticipants] = useState('');
  const [context, setContext] = useState('');
  
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'audio/*': ['.mp3', '.wav', '.m4a', '.ogg', '.mp4'],
    },
    maxFiles: 1,
    onDrop: (acceptedFiles, rejectedFiles) => {
      setError('');
      if (rejectedFiles.length > 0) {
        setError('Please drop a valid audio file (.mp3, .wav, .m4a, .ogg).');
        return;
      }
      const selected = acceptedFiles[0];
      if (selected.size > MAX_SIZE_BYTES) {
        setError(`File size exceeds 500 MB limit (${(selected.size / (1024 * 1024)).toFixed(1)} MB).`);
        return;
      }
      setFile(selected);
      if (!title) {
        // Auto-generate title from filename
        const baseName = selected.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        setTitle(baseName.charAt(0).toUpperCase() + baseName.slice(1));
      }
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please choose or drop an audio recording.');
      return;
    }
    if (!title.trim()) {
      setError('Please provide a meeting title.');
      return;
    }

    setUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('meeting_date', meetingDate);
    formData.append('participants', participants);
    formData.append('context', context);

    try {
      const response = await apiClient.post('/meetings/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total || 1)
          );
          setUploadProgress(percentCompleted);
        },
      });

      navigate(`/meetings/${response.data.id}`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Upload failed. Check your file and network.');
      setUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy-900">Upload Meeting Recording</h1>
        <p className="text-sm text-slate-500 mt-1">
          Drop your recording here. Faster-Whisper and Ollama will process the audio locally.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
              isDragActive
                ? 'border-brand-600 bg-brand-50/50'
                : file
                ? 'border-emerald-400 bg-emerald-50/30'
                : 'border-slate-300 hover:border-brand-500 bg-slate-50'
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center justify-center">
              {file ? (
                <>
                  <FileAudio className="w-12 h-12 text-emerald-600 mb-2" />
                  <span className="font-semibold text-sm text-slate-800">{file.name}</span>
                  <span className="text-xs text-slate-500 mt-0.5">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB • Ready for processing
                  </span>
                  <span className="mt-3 text-xs text-brand-700 font-semibold underline">
                    Click or drag another file to replace
                  </span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-12 h-12 text-brand-700 mb-2" />
                  <p className="font-semibold text-slate-800 text-sm">
                    Drag and drop your meeting audio file, or{' '}
                    <span className="text-brand-700 underline">browse</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Supports MP3, WAV, M4A, MP4, OGG up to 500 MB
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Form fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Meeting Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Q4 Engineering Roadmap"
                className="mt-1.5 w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-600 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Meeting Date
              </label>
              <input
                type="date"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                className="mt-1.5 w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-600 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Participants
            </label>
            <input
              type="text"
              value={participants}
              onChange={(e) => setParticipants(e.target.value)}
              placeholder="e.g. Alice, Bob, Charlie (comma separated)"
              className="mt-1.5 w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-600 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Agenda / Context (Optional)
            </label>
            <textarea
              rows={3}
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Provide agenda or background context to guide the LLM summary..."
              className="mt-1.5 w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-600 focus:bg-white"
            />
          </div>

          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-600">
                <span>Uploading audio...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-700 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              type="submit"
              disabled={uploading || !file}
              className="flex items-center space-x-2 px-6 py-2.5 bg-brand-700 hover:bg-brand-800 disabled:opacity-50 text-white rounded-lg font-semibold text-sm transition shadow-sm"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Uploading Recording...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>Submit & Start Processing</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
