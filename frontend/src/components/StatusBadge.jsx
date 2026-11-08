import React from 'react';
import { 
  Clock, 
  Loader2, 
  FileText, 
  Sparkles, 
  CheckCircle, 
  AlertCircle,
  FileCheck2
} from 'lucide-react';

const STATUS_CONFIG = {
  uploaded: { label: 'Uploaded', bg: 'bg-slate-100 text-slate-700 border-slate-300', icon: Clock },
  queued: { label: 'Queued', bg: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock },
  transcribing: { label: 'Transcribing', bg: 'bg-sky-50 text-sky-700 border-sky-200', icon: Loader2, spin: true },
  analysing: { label: 'Analysing', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: Sparkles, spin: true },
  generating: { label: 'Generating Docs', bg: 'bg-purple-50 text-purple-700 border-purple-200', icon: FileText, spin: true },
  awaiting_review: { label: 'Awaiting Review', bg: 'bg-teal-50 text-teal-700 border-teal-200', icon: FileCheck2 },
  completed: { label: 'Completed', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle },
  failed: { label: 'Failed', bg: 'bg-rose-50 text-rose-700 border-rose-200', icon: AlertCircle },
};

export default function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || {
    label: status,
    bg: 'bg-slate-100 text-slate-700 border-slate-200',
    icon: Clock,
  };

  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.bg}`}>
      <Icon className={`w-3.5 h-3.5 ${config.spin ? 'animate-spin' : ''}`} />
      <span>{config.label}</span>
    </span>
  );
}
