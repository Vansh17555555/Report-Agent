import React, { useState } from 'react';
import { Send, Sparkles } from 'lucide-react';

const InputArea = ({ onSend, disabled, placeholder }) => {
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim() || disabled) return;
    onSend(input);
    setInput("");
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="relative group">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-2xl opacity-20 group-hover:opacity-40 transition duration-500 blur"></div>
      
      <div className="relative flex items-end gap-2 p-2 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 focus-within:border-cyan-500/50 focus-within:ring-1 focus-within:ring-cyan-500/20 transition-all">
        <div className="pb-3 pl-3 text-slate-500">
            <Sparkles size={18} />
        </div>
        
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || "Ask a strategic question..."}
          disabled={disabled}
          className="w-full bg-transparent border-none focus:ring-0 text-slate-200 placeholder:text-slate-500 text-sm py-3 max-h-32 min-h-[50px] resize-none scrollbar-hide"
          rows={1}
        />
        
        <button
          onClick={handleSend}
          disabled={disabled || !input.trim()}
          className="p-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-900/20 transition-all disabled:opacity-0 disabled:scale-75 transform duration-200"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
};

export default InputArea;
