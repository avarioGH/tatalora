'use client';
import { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, Bot, Minimize2, Check, X, RotateCcw } from 'lucide-react';

interface ChatMessage {
 role: string;
 text: string;
 action?: any;
 actionState?: 'PENDING' | 'EXECUTED' | 'UNDONE' | 'REJECTED';
}

export default function AiAssistant() {
 const [isOpen, setIsOpen] = useState(false);
 const [messages, setMessages] = useState<ChatMessage[]>([
 { role: 'model', text: 'Halo! Saya Boostup AI. Ada yang bisa saya bantu terkait laporan atau pengubahan data?' }
 ]);
 const [input, setInput] = useState('');
 const [isLoading, setIsLoading] = useState(false);
 const messagesEndRef = useRef<HTMLDivElement>(null);

 const scrollToBottom = () => {
 messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
 };

 useEffect(() => {
 scrollToBottom();
 }, [messages]);

 const handleSend = async () => {
 if (!input.trim()) return;
 const userMsg: ChatMessage = { role: 'user', text: input };
 setMessages(prev => [...prev, userMsg]);
 setInput('');
 setIsLoading(true);
 try {
 const token = localStorage.getItem('erp_token');
 const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8237'}/api/ai/chat`, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
 body: JSON.stringify({ prompt: userMsg.text, chatHistory: messages })
 });
 const data = await res.json();
 if (data.response) {
 setMessages(prev => [...prev, { role: 'model', text: data.response, action: data.action, actionState: data.action ? 'PENDING' : undefined }]);
 } else {
 setMessages(prev => [...prev, { role: 'model', text: data.message || ('HTTP ' + res.status + ' ' + res.statusText) || 'Maaf, terjadi kesalahan pada server.' }]);
 }
 } catch {
 setMessages(prev => [...prev, { role: 'model', text: 'Koneksi terputus. Gagal menghubungi AI.' }]);
 } finally {
 setIsLoading(false);
 }
 };

 const handleAction = async (msgIndex: number, actionData: any, type: 'execute' | 'undo' | 'reject') => {
 if (type === 'reject') {
 setMessages(prev => { const next = [...prev]; next[msgIndex].actionState = 'REJECTED'; return next; });
 return;
 }
 setIsLoading(true);
 try {
 const token = localStorage.getItem('erp_token');
 const endpoint = type === 'execute' ? 'execute' : 'undo';
 const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8237'}/api/ai/${endpoint}`, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
 body: JSON.stringify({ actionData })
 });
 const data = await res.json();
 if (data.success) {
 setMessages(prev => { const next = [...prev]; next[msgIndex].actionState = type === 'execute' ? 'EXECUTED' : 'UNDONE'; return next; });
 } else {
 alert(data.message || 'Gagal mengeksekusi aksi.');
 }
 } catch {
 alert('Koneksi terputus saat mengeksekusi aksi.');
 }
 setIsLoading(false);
 };

 return (
 <div className="fixed bottom-6 right-6 z-50">
 {!isOpen ? (
 <button onClick={() => setIsOpen(true)} className=" p-4 rounded-full shadow-xl transition-transform hover:scale-110 flex items-center justify-center">
 <MessageCircle size={24} />
 </button>
 ) : (
 <div className="bg-[#1e1e2e] rounded-xl shadow-2xl w-80 md:w-96 flex flex-col overflow-hidden border border-gray-700" style={{ height: '520px' }}>
 {/* Header */}
 <div className="bg-indigo-600 text-white px-4 py-3 flex justify-between items-center">
 <div className="flex items-center gap-2">
 <Bot size={20} />
 <h3 className="font-semibold text-sm">Boostup AI Assistant</h3>
 </div>
 <button onClick={() => setIsOpen(false)} className="text-indigo-200 hover:text-white transition-colors">
 <Minimize2 size={18} />
 </button>
 </div>

 {/* Chat Area */}
 <div className="flex-1 p-4 overflow-y-auto bg-[#1e1e2e] flex flex-col gap-3 text-sm">
 {messages.map((msg, idx) => (
 <div key={idx} className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
 <div className={`max-w-[90%] p-3 text-sm leading-relaxed ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-sm' : 'bg-[#2a2a3e] border border-gray-700 text-gray-100 rounded-2xl rounded-tl-sm'}`}>
 <p className="whitespace-pre-wrap">{msg.text}</p>
 </div>

 {/* Action Card */}
 {msg.action && (
 <div className="w-[90%] bg-[#2a2a3e] border border-indigo-500/40 rounded-xl p-3 flex flex-col gap-2">
 <div>
 <h4 className="font-bold text-white text-xs">{msg.action.title}</h4>
 <p className="text-xs text-gray-400 mt-0.5">{msg.action.description}</p>
 </div>
 {msg.actionState === 'PENDING' && (
 <div className="flex gap-2 mt-1">
 <button onClick={() => handleAction(idx, msg.action, 'execute')} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-1.5 rounded-lg flex items-center justify-center gap-1 font-medium transition-colors text-xs">
 <Check size={14} /> Izinkan
 </button>
 <button onClick={() => handleAction(idx, msg.action, 'reject')} className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-200 py-1.5 rounded-lg flex items-center justify-center gap-1 font-medium transition-colors text-xs">
 <X size={14} /> Tolak
 </button>
 </div>
 )}
 {msg.actionState === 'EXECUTED' && (
 <div className="flex flex-col gap-2 mt-1">
 <div className="bg-green-900/40 text-green-400 text-xs px-2 py-1.5 rounded flex items-center gap-1">
 <Check size={12} /> Tindakan Disetujui
 </div>
 <button onClick={() => handleAction(idx, msg.action, 'undo')} className="w-full bg-yellow-900/40 hover:bg-yellow-900/60 text-yellow-400 py-1.5 rounded-lg flex items-center justify-center gap-1 font-medium transition-colors text-xs">
 <RotateCcw size={12} /> Batalkan (Undo)
 </button>
 </div>
 )}
 {msg.actionState === 'REJECTED' && (
 <div className="bg-gray-800 text-gray-500 text-xs px-2 py-1.5 rounded flex items-center gap-1 mt-1">
 <X size={12} /> Ditolak
 </div>
 )}
 {msg.actionState === 'UNDONE' && (
 <div className="bg-yellow-900/40 text-yellow-400 text-xs px-2 py-1.5 rounded flex items-center gap-1 mt-1">
 <RotateCcw size={12} /> Telah Dibatalkan
 </div>
 )}
 </div>
 )}
 </div>
 ))}

 {isLoading && (
 <div className="flex justify-start">
 <div className="bg-[#2a2a3e] border border-gray-700 rounded-2xl rounded-tl-sm p-3 flex items-center gap-1.5">
 <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
 <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
 <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
 </div>
 </div>
 )}
 <div ref={messagesEndRef} />
 </div>

 {/* Input Area */}
 <div className="p-3 bg-[#16162a] border-t border-gray-700 flex items-center gap-2">
 <input
 type="text"
 value={input}
 onChange={(e) => setInput(e.target.value)}
 onKeyDown={(e) => e.key === 'Enter' && handleSend()}
 placeholder="Tanya atau instruksikan..."
 className="flex-1 px-4 py-2 bg-[#2a2a3e] border border-gray-600 rounded-full text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500 text-sm"
 disabled={isLoading}
 />
 <button
 onClick={handleSend}
 disabled={isLoading || !input.trim()}
 className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-700 disabled:text-gray-500 text-white p-2 rounded-full flex items-center justify-center min-w-[38px] min-h-[38px] transition-colors"
 >
 <Send size={16} className="ml-0.5" />
 </button>
 </div>
 </div>
 )}
 </div>
 );
}



