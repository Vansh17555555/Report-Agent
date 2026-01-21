import React from 'react';
import ReactMarkdown from 'react-markdown';
import { User, Bot, FileText } from 'lucide-react';

const MessageBubble = ({ role, content, sources }) => {
  const isUser = role === 'user';
  
  return (
    <div className={`flex gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'} animate-fade-in group`}>
      
      {/* Avatar */}
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg ${isUser ? 'bg-gradient-to-br from-blue-600 to-cyan-600' : 'bg-gradient-to-br from-purple-600 to-indigo-600'}`}>
        {isUser ? <User size={18} className="text-white" /> : <Bot size={18} className="text-white" />}
      </div>

      {/* Bubble */}
      <div className={`flex flex-col max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`px-6 py-4 rounded-2xl shadow-xl backdrop-blur-sm border ${
            isUser 
              ? 'bg-gradient-to-br from-cyan-600/20 to-blue-600/20 border-cyan-500/30 rounded-tr-sm' 
              : 'bg-white/5 border-white/10 rounded-tl-sm'
          }`}>
          
          {/* Header Name */}
          <span className={`text-[10px] uppercase tracking-wider font-bold mb-2 block ${isUser ? 'text-cyan-400 text-right' : 'text-purple-400'}`}>
             {isUser ? 'You' : 'Analysis'}
          </span>

          <div className="prose prose-invert prose-sm leading-relaxed text-slate-200 max-w-none">
             <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        </div>

        {/* Citations Footer */}
        {!isUser && sources && sources.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2 animate-fade-in">
                {sources.map((src, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 hover:border-purple-500/40 hover:bg-purple-500/10 transition-colors cursor-pointer text-xs text-slate-400 hover:text-purple-300">
                        <FileText size={12} />
                        <span className="truncate max-w-[150px]">{src}</span>
                    </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
