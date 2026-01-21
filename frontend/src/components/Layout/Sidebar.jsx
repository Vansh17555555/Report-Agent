import React, { useRef, useState } from 'react';
import { Upload, FileText, Database, Plus, Sparkles, Trash2, History, MessageSquare, Menu } from 'lucide-react';

const Sidebar = ({ files, sessions, currentSessionId, onUpload, onDelete, onSelectSession, onNewChat, uploading }) => {
  const fileInputRef = useRef(null);
  const [tab, setTab] = useState('files'); // 'files' or 'history'

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      onUpload(e.target.files[0]);
    }
  };

  return (
    <div className="w-80 h-full flex flex-col glass-panel border-r-0 rounded-none bg-slate-900/80">
      
      {/* Header */}
      <div className="p-6 border-b border-white/5 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="flex items-center gap-2 mb-1 relative z-10 cursor-pointer" onClick={onNewChat}>
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20">
            <Sparkles size={16} className="text-white" />
          </div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 font-display">
            Insights
          </h1>
        </div>
        <p className="text-xs text-slate-500 pl-1">Executive Workspace</p>
      </div>

      {/* Tabs */}
      <div className="flex p-2 gap-1 border-b border-white/5">
        <button 
            onClick={() => setTab('files')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all ${tab === 'files' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'}`}
        >
            <Database size={14} /> Knowledge
        </button>
        <button 
            onClick={() => setTab('history')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all ${tab === 'history' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'}`}
        >
            <History size={14} /> History
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        
        {tab === 'files' ? (
            <div className="space-y-2">
            {files.length === 0 ? (
                <div className="text-center py-10 px-4 border border-dashed border-white/5 rounded-xl bg-white/[0.02]">
                <p className="text-xs text-slate-500 mb-2">No documents</p>
                <p className="text-[10px] text-slate-600">Upload a PDF</p>
                </div>
            ) : (
                files.map((file, idx) => (
                <div key={idx} className="group flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-all">
                    <div className="p-2 rounded-lg bg-slate-800 text-cyan-500">
                        <FileText size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-300 truncate font-medium">{file}</p>
                        <p className="text-[10px] text-slate-600">Indexed</p>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(file); }} className="p-1.5 rounded-md hover:bg-red-500/20 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                        <Trash2 size={14} />
                    </button>
                </div>
                ))
            )}
            </div>
        ) : (
            <div className="space-y-2">
            {!sessions || sessions.length === 0 ? (
                <div className="text-center py-10">
                    <p className="text-xs text-slate-500">No recent chats</p>
                </div>
            ) : (
                sessions.map((session, idx) => (
                    <div 
                        key={idx} 
                        onClick={() => onSelectSession(session.id)}
                        className={`group flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${currentSessionId === session.id ? 'bg-white/10 border-cyan-500/30' : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05]'}`}
                    >
                        <div className="p-2 rounded-lg bg-slate-800 text-purple-500">
                             <MessageSquare size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-300 truncate font-medium">{session.title}</p>
                            <p className="text-[10px] text-slate-600">{new Date(session.date).toLocaleDateString()}</p>
                        </div>
                    </div>
                ))
            )}
            </div>
        )}

      </div>

      {/* Footer / Upload */}
      <div className="p-4 border-t border-white/5 bg-black/20">
        <input type="file" ref={fileInputRef} className="hidden" accept=".pdf" onChange={handleFileChange} />
        <button 
          onClick={() => tab === 'files' ? fileInputRef.current?.click() : onNewChat()}
          disabled={uploading}
          className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium shadow-lg hover:shadow-cyan-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {uploading ? <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full"/> : <Plus size={18} />}
          {tab === 'files' ? (uploading ? 'Processing...' : 'New Document') : 'New Chat'}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
