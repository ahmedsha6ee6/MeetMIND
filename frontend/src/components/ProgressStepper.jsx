import React from 'react';
import { Check, Loader2, AlertCircle } from 'lucide-react';

const STAGES = [
  { key: 'queued', label: 'Queued' },
  { key: 'transcribing', label: 'Whisper ASR' },
  { key: 'analysing', label: 'Ollama Analysis' },
  { key: 'generating', label: 'Document Render' },
  { key: 'awaiting_review', label: 'Ready for Review' },
];

export default function ProgressStepper({ currentStatus, error }) {
  const getStageIndex = (status) => {
    if (status === 'completed' || status === 'awaiting_review') return 4;
    if (status === 'generating') return 3;
    if (status === 'analysing') return 2;
    if (status === 'transcribing') return 1;
    return 0; // uploaded, queued, or unknown
  };

  const currentIndex = getStageIndex(currentStatus);
  const isFailed = currentStatus === 'failed';

  return (
    <div className="w-full bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between relative">
        {STAGES.map((stage, idx) => {
          const isDone = !isFailed && idx < currentIndex;
          const isCurrent = !isFailed && idx === currentIndex;

          return (
            <div key={stage.key} className="flex-1 flex flex-col items-center relative z-10">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-colors shadow-sm ${
                  isDone
                    ? 'bg-brand-700 text-white'
                    : isCurrent
                    ? 'bg-sky-600 text-white ring-4 ring-sky-100'
                    : isFailed && idx === currentIndex
                    ? 'bg-rose-600 text-white ring-4 ring-rose-100'
                    : 'bg-slate-100 text-slate-400 border border-slate-300'
                }`}
              >
                {isDone ? (
                  <Check className="w-5 h-5 stroke-[2.5]" />
                ) : isCurrent ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : isFailed && idx === currentIndex ? (
                  <AlertCircle className="w-5 h-5" />
                ) : (
                  idx + 1
                )}
              </div>
              <span
                className={`mt-2 text-xs font-medium text-center ${
                  isDone || isCurrent ? 'text-slate-900 font-semibold' : 'text-slate-400'
                }`}
              >
                {stage.label}
              </span>
            </div>
          );
        })}

        {/* Connecting line */}
        <div className="absolute top-4 left-8 right-8 h-0.5 bg-slate-200 -z-0">
          <div
            className={`h-full transition-all duration-500 ${
              isFailed ? 'bg-rose-500' : 'bg-brand-700'
            }`}
            style={{
              width: `${(Math.min(currentIndex, STAGES.length - 1) / (STAGES.length - 1)) * 100}%`,
            }}
          />
        </div>
      </div>

      {isFailed && error && (
        <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Processing stalled:</span> {error}
          </div>
        </div>
      )}
    </div>
  );
}
