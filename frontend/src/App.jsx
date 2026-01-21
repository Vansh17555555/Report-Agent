import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Layout/Sidebar';
import MessageBubble from './components/Chat/MessageBubble';
import InputArea from './components/Chat/InputArea';
import { Sparkles, Command, FileText, MessageSquare } from 'lucide-react';

const API_Base = "http://localhost:8000/api";

function App() {
  const [messages, setMessages] = useState([]);
  const [files, setFiles] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  
  const [uploading, setUploading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [mode, setMode] = useState('chat'); 
  const [reportStatus, setReportStatus] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchFiles();
    fetchSessions();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming, reportStatus]);

  const fetchFiles = async () => {
    try {
      const res = await fetch(`${API_Base}/files`);
      const data = await res.json();
      setFiles(data.files || []);
    } catch (e) {
      console.error("Failed to fetch files", e);
    }
  };

  const fetchSessions = async () => {
      try {
          const res = await fetch(`${API_Base}/sessions`);
          const data = await res.json();
          setSessions(data || []);
      } catch (e) {
          console.error("Failed to fetch sessions", e);
      }
  };

  const loadSession = async (sessionId) => {
      try {
          const res = await fetch(`${API_Base}/sessions/${sessionId}`);
          const data = await res.json();
          setMessages(data || []);
          setCurrentSessionId(sessionId);
          setMode('chat'); // Default to chat when loading legacy
      } catch (e) {
          console.error("Failed to load session", e);
      }
  };

  const createNewSession = async () => {
      setMessages([]);
      setCurrentSessionId(null);
      setMode('chat');
  };

  const handleUpload = async (file) => {
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API_Base}/ingest`, { method: "POST", body: formData });
      if (res.ok) await fetchFiles();
    } catch (e) {
      console.error("Upload failed", e);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (filename) => {
    try {
        const res = await fetch(`${API_Base}/files/${filename}`, { method: "DELETE" });
        if (res.ok) await fetchFiles();
    } catch (e) {
        console.error("Delete failed", e);
    }
  };

  const handleSend = async (text) => {
    if (mode === 'report') {
        handleGenerateReport(text);
    } else {
        handleChat(text);
    }
  };

  const handleChat = async (text) => {
    const userMsg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setIsStreaming(true);

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const response = await fetch(`${API_Base}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history, session_id: currentSessionId })
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let aiResponseContent = "";
      setMessages(prev => [...prev, { role: 'ai', content: "", sources: [] }]);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        aiResponseContent += chunk;
        setMessages(prev => {
          const newMsg = [...prev];
          newMsg[newMsg.length - 1].content = aiResponseContent;
          return newMsg;
        });
      }
      // Refresh sessions list to show new title/session if created
      fetchSessions();
      
    } catch (e) {
      setMessages(prev => [...prev, { role: 'ai', content: "Error connecting to backend." }]);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleGenerateReport = async (topic) => {
    const userMsg = { role: 'user', content: `Generate Report: ${topic}` };
    setMessages(prev => [...prev, userMsg]);
    setIsStreaming(true);
    setReportStatus("Initializing Agent...");

    try {
        const response = await fetch(`${API_Base}/report`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ topic })
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let reportContent = "";
        
        setMessages(prev => [...prev, { role: 'ai', content: "", params: { type: 'report' } }]);

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n\n");
            buffer = lines.pop(); 

            for (const line of lines) {
                if (line.startsWith("event: status")) continue; 
                if (line.startsWith("data: ")) {
                   const data = line.replace("data: ", "");
                   if (data.includes("Analyzing") || data.includes("Plan generated") || data.includes("Executing search") || data.includes("Analyzed")) {
                       setReportStatus(data);
                   } else {
                       reportContent += data;
                       setMessages(prev => {
                           const newMsg = [...prev];
                           const lastMsg = newMsg[newMsg.length - 1];
                           lastMsg.content = reportContent;
                           return newMsg;
                       });
                   }
                }
            }
        }
    } catch (e) {
        setMessages(prev => [...prev, { role: 'ai', content: "Report Generation Failed." }]);
    } finally {
        setIsStreaming(false);
        setReportStatus("");
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-slate-900 to-black text-slate-200 font-sans selection:bg-cyan-500/30">
      <Sidebar 
          files={files} 
          sessions={sessions}
          currentSessionId={currentSessionId}
          onUpload={handleUpload} 
          onDelete={handleDelete} 
          onSelectSession={loadSession}
          onNewChat={createNewSession}
          uploading={uploading} 
      />
      
      <div className="flex-1 flex flex-col relative">
        {/* Mode Toggle Header */}
        <div className="absolute top-6 right-6 z-20 flex bg-black/40 backdrop-blur-md rounded-full p-1 border border-white/10">
            <button 
                onClick={() => setMode('chat')}
                className={`px-4 py-2 rounded-full text-xs font-medium transition-all flex items-center gap-2 ${mode === 'chat' ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
                <MessageSquare size={14} /> Chat
            </button>
            <button 
                onClick={() => setMode('report')}
                className={`px-4 py-2 rounded-full text-xs font-medium transition-all flex items-center gap-2 ${mode === 'report' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
                <FileText size={14} /> Report Agent
            </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth custom-scrollbar">
          <div className="max-w-4xl mx-auto min-h-full flex flex-col justify-end pb-4">
             {messages.length === 0 ? (
                /* Hero Section */
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8 animate-fade-in">
                    <div className="p-6 bg-black ring-1 ring-white/10 rounded-full shadow-2xl relative">
                       <span className={`absolute inset-0 rounded-full blur opacity-40 bg-gradient-to-r ${mode === 'report' ? 'from-purple-500 to-pink-500' : 'from-cyan-400 to-blue-600'}`}></span>
                       <Sparkles size={48} className={mode === 'report' ? "text-purple-400" : "text-cyan-400"} />
                    </div>
                    <h2 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-white to-slate-500 font-display">
                      {mode === 'report' ? 'Deep Research Agent' : 'Executive Insights'}
                    </h2>
                    <p className="text-lg text-slate-400 max-w-lg mx-auto">
                        {mode === 'report' 
                          ? 'I plan research, gather evidence from your documents, and write comprehensive reports.' 
                          : 'Chat with your documents in a secure, private environment.'}
                    </p>
                </div>
             ) : (
                <div className="space-y-8 pb-10">
                    {messages.map((msg, idx) => (
                        <div key={idx}>
                            <MessageBubble role={msg.role} content={msg.content} sources={msg.sources} />
                        </div>
                    ))}
                    {isStreaming && reportStatus && (
                        <div className="flex justify-center my-4 animate-fade-in">
                            <div className="px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs flex items-center gap-2">
                                <span className="animate-spin">⟳</span> {reportStatus}
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
             )}
          </div>
        </div>

        <div className="p-6 bg-gradient-to-t from-slate-900 via-slate-900/90 to-transparent">
          <div className="max-w-3xl mx-auto">
            <InputArea 
                onSend={handleSend} 
                disabled={isStreaming} 
                placeholder={mode === 'report' ? "Enter a topic for research..." : "Ask a question..."}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
