import React, { useState } from 'react';
import { 
  Save, 
  Plus, 
  Trash2, 
  AlertTriangle, 
  Check, 
  HelpCircle,
  Calendar,
  User,
  CheckCircle2
} from 'lucide-react';
import apiClient from '../api/client';

export default function MOMEditor({ meeting, onUpdateSuccess }) {
  const [version, setVersion] = useState(meeting.version);
  const [momData, setMomData] = useState(
    meeting.mom_data || {
      summary: '',
      discussion_topics: [],
      decisions: [],
      action_items: [],
      open_questions: [],
    }
  );

  const [saving, setSaving] = useState(false);
  const [conflictError, setConflictError] = useState(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Field mutators
  const handleSummaryChange = (e) => {
    setMomData({ ...momData, summary: e.target.value });
  };

  const handleAddTopic = () => {
    setMomData({
      ...momData,
      discussion_topics: [...(momData.discussion_topics || []), ''],
    });
  };

  const handleUpdateTopic = (index, value) => {
    const updated = [...momData.discussion_topics];
    updated[index] = value;
    setMomData({ ...momData, discussion_topics: updated });
  };

  const handleRemoveTopic = (index) => {
    const updated = momData.discussion_topics.filter((_, i) => i !== index);
    setMomData({ ...momData, discussion_topics: updated });
  };

  const handleAddDecision = () => {
    setMomData({
      ...momData,
      decisions: [
        ...(momData.decisions || []),
        { description: '', confidence: 'explicit' },
      ],
    });
  };

  const handleUpdateDecision = (index, field, value) => {
    const updated = [...momData.decisions];
    updated[index][field] = value;
    setMomData({ ...momData, decisions: updated });
  };

  const handleRemoveDecision = (index) => {
    const updated = momData.decisions.filter((_, i) => i !== index);
    setMomData({ ...momData, decisions: updated });
  };

  const handleAddAction = () => {
    setMomData({
      ...momData,
      action_items: [
        ...(momData.action_items || []),
        { task: '', owner: '', deadline: '', confidence: 'explicit' },
      ],
    });
  };

  const handleUpdateAction = (index, field, value) => {
    const updated = [...momData.action_items];
    updated[index][field] = value;
    setMomData({ ...momData, action_items: updated });
  };

  const handleRemoveAction = (index) => {
    const updated = momData.action_items.filter((_, i) => i !== index);
    setMomData({ ...momData, action_items: updated });
  };

  const handleAddQuestion = () => {
    setMomData({
      ...momData,
      open_questions: [...(momData.open_questions || []), ''],
    });
  };

  const handleUpdateQuestion = (index, value) => {
    const updated = [...momData.open_questions];
    updated[index] = value;
    setMomData({ ...momData, open_questions: updated });
  };

  const handleRemoveQuestion = (index) => {
    const updated = momData.open_questions.filter((_, i) => i !== index);
    setMomData({ ...momData, open_questions: updated });
  };

  // Save handler with optimistic lock guard (F7 fix)
  const handleSave = async () => {
    setSaving(true);
    setConflictError(null);
    setSavedSuccess(false);

    try {
      const response = await apiClient.patch(`/meetings/${meeting.id}`, {
        version: version,
        mom_data: momData,
      });

      setVersion(response.data.version);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
      if (onUpdateSuccess) {
        onUpdateSuccess(response.data);
      }
    } catch (err) {
      if (err.response && err.response.status === 409) {
        setConflictError(
          'Concurrency Conflict: Another update occurred while you were editing. Please refresh to load the latest minutes.'
        );
      } else {
        alert(err.response?.data?.detail || 'Failed to save changes');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-8">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-navy-900">Minutes of Meeting Editor</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Optimistic Locking: Version <span className="font-mono font-bold text-brand-700">{version}</span>
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {savedSuccess && (
            <span className="flex items-center space-x-1 text-sm font-medium text-emerald-600">
              <Check className="w-4 h-4" />
              <span>Saved!</span>
            </span>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center space-x-2 px-4 py-2 bg-brand-700 hover:bg-brand-800 disabled:opacity-50 text-white rounded-lg font-medium text-sm transition shadow-sm"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save MOM Changes'}</span>
          </button>
        </div>
      </div>

      {conflictError && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 flex items-start space-x-3 text-sm">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-600 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold">Save Conflict Notice: </span>
            {conflictError}
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-3 py-1 bg-amber-600 text-white text-xs font-semibold rounded hover:bg-amber-700"
          >
            Refresh Page
          </button>
        </div>
      )}

      {/* 1. Summary */}
      <div className="space-y-2">
        <label className="block text-sm font-bold text-slate-800">1. Executive Summary</label>
        <textarea
          rows={4}
          value={momData.summary || ''}
          onChange={handleSummaryChange}
          placeholder="Enter high-level meeting summary..."
          className="w-full p-3 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-600 focus:border-brand-600 transition"
        />
      </div>

      {/* 2. Discussion Topics */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-bold text-slate-800">2. Discussion Topics</label>
          <button
            onClick={handleAddTopic}
            className="flex items-center space-x-1 text-xs text-brand-700 hover:text-brand-900 font-semibold"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Topic</span>
          </button>
        </div>

        <div className="space-y-2">
          {(momData.discussion_topics || []).map((topic, i) => (
            <div key={i} className="flex items-center space-x-2">
              <span className="text-xs text-slate-400 font-mono w-5">{i + 1}.</span>
              <input
                type="text"
                value={topic}
                onChange={(e) => handleUpdateTopic(i, e.target.value)}
                placeholder="Discussion topic item..."
                className="flex-1 p-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-brand-600"
              />
              <button
                onClick={() => handleRemoveTopic(i)}
                className="text-slate-400 hover:text-rose-500 p-1"
                title="Remove topic"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {(!momData.discussion_topics || momData.discussion_topics.length === 0) && (
            <p className="text-xs text-slate-400 italic">No discussion topics recorded.</p>
          )}
        </div>
      </div>

      {/* 3. Decisions Made */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-bold text-slate-800">3. Decisions Made</label>
          <button
            onClick={handleAddDecision}
            className="flex items-center space-x-1 text-xs text-brand-700 hover:text-brand-900 font-semibold"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Decision</span>
          </button>
        </div>

        <div className="space-y-3">
          {(momData.decisions || []).map((decision, i) => (
            <div key={i} className="flex items-start space-x-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <input
                type="text"
                value={decision.description || ''}
                onChange={(e) => handleUpdateDecision(i, 'description', e.target.value)}
                placeholder="Decision description..."
                className="flex-1 p-2 text-sm border border-slate-300 rounded-md bg-white"
              />
              <select
                value={decision.confidence || 'explicit'}
                onChange={(e) => handleUpdateDecision(i, 'confidence', e.target.value)}
                className="p-2 text-xs border border-slate-300 rounded-md bg-white text-slate-700"
              >
                <option value="explicit">Explicit</option>
                <option value="inferred">Inferred</option>
              </select>
              <button
                onClick={() => handleRemoveDecision(i)}
                className="text-slate-400 hover:text-rose-500 p-2"
                title="Remove decision"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {(!momData.decisions || momData.decisions.length === 0) && (
            <p className="text-xs text-slate-400 italic">No decisions recorded.</p>
          )}
        </div>
      </div>

      {/* 4. Action Items */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-bold text-slate-800">4. Action Items & Assignments</label>
          <button
            onClick={handleAddAction}
            className="flex items-center space-x-1 text-xs text-brand-700 hover:text-brand-900 font-semibold"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Action Item</span>
          </button>
        </div>

        <div className="space-y-3">
          {(momData.action_items || []).map((action, i) => (
            <div key={i} className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5">
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={action.task || ''}
                  onChange={(e) => handleUpdateAction(i, 'task', e.target.value)}
                  placeholder="Task description..."
                  className="flex-1 p-2 text-sm border border-slate-300 rounded-md bg-white font-medium"
                />
                <button
                  onClick={() => handleRemoveAction(i)}
                  className="text-slate-400 hover:text-rose-500 p-1"
                  title="Remove action item"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="flex items-center space-x-1.5 bg-white border border-slate-300 rounded px-2.5 py-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={action.owner || ''}
                    onChange={(e) => handleUpdateAction(i, 'owner', e.target.value || null)}
                    placeholder="Owner (or leave blank)"
                    className="w-full focus:outline-none"
                  />
                </div>

                <div className="flex items-center space-x-1.5 bg-white border border-slate-300 rounded px-2.5 py-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={action.deadline || ''}
                    onChange={(e) => handleUpdateAction(i, 'deadline', e.target.value || null)}
                    placeholder="Deadline (YYYY-MM-DD)"
                    className="w-full focus:outline-none"
                  />
                </div>

                <div className="flex items-center space-x-1.5 bg-white border border-slate-300 rounded px-2 py-1">
                  <span className="text-slate-400">Confidence:</span>
                  <select
                    value={action.confidence || 'explicit'}
                    onChange={(e) => handleUpdateAction(i, 'confidence', e.target.value)}
                    className="w-full bg-transparent focus:outline-none"
                  >
                    <option value="explicit">Explicit</option>
                    <option value="inferred">Inferred</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
          {(!momData.action_items || momData.action_items.length === 0) && (
            <p className="text-xs text-slate-400 italic">No action items recorded.</p>
          )}
        </div>
      </div>

      {/* 5. Open Questions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-bold text-slate-800">5. Unresolved Questions</label>
          <button
            onClick={handleAddQuestion}
            className="flex items-center space-x-1 text-xs text-brand-700 hover:text-brand-900 font-semibold"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Question</span>
          </button>
        </div>

        <div className="space-y-2">
          {(momData.open_questions || []).map((q, i) => (
            <div key={i} className="flex items-center space-x-2">
              <span className="text-xs text-slate-400 font-mono w-5">?</span>
              <input
                type="text"
                value={q}
                onChange={(e) => handleUpdateQuestion(i, e.target.value)}
                placeholder="Unresolved question..."
                className="flex-1 p-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-brand-600"
              />
              <button
                onClick={() => handleRemoveQuestion(i)}
                className="text-slate-400 hover:text-rose-500 p-1"
                title="Remove question"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {(!momData.open_questions || momData.open_questions.length === 0) && (
            <p className="text-xs text-slate-400 italic">No unresolved questions recorded.</p>
          )}
        </div>
      </div>
    </div>
  );
}
