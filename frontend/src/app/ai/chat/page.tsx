"use client"

import { useState, useRef, useEffect } from"react"
import { Button } from"@/components/ui/button"
import { Input } from"@/components/ui/input"
import { Send, Bot, User, Sparkles, MessageSquare, History, Plus } from"lucide-react"
import { api } from"@/lib/api"
import Link from"next/link"

export default function AiChatPage() {
 const [messages, setMessages] = useState([
 { role: 'ai', content:"Halo! Saya adalah Boostup AI Assistant, penasihat bisnis pribadi Anda. Anda bisa menanyakan analisis performa toko, ketersediaan stok di berbagai gudang, laporan keuangan, maupun performa karyawan. Ada yang bisa saya bantu hari ini?" }
 ])
 const [input, setInput] = useState("")
 const [isLoading, setIsLoading] = useState(false)
 const messagesEndRef = useRef<HTMLDivElement>(null)

 const scrollToBottom = () => {
 messagesEndRef.current?.scrollIntoView({ behavior:"smooth" })
 }

 useEffect(() => {
 scrollToBottom()
 }, [messages])

 const handleSend = async (e: React.FormEvent) => {
 e.preventDefault()
 if (!input.trim()) return

 const userMessage = input.trim()
 setInput("")
 setMessages(prev => [...prev, { role: 'user', content: userMessage }])
 setIsLoading(true)

 try {
 const res = await api.post('/platform/ai/ask', { prompt: userMessage })
 setMessages(prev => [...prev, { role: 'ai', content: (res.data.insight || res.data.response) }])
 } catch (err) {
 console.error(err)
 setMessages(prev => [...prev, { role: 'ai', content:"Maaf, terjadi kesalahan saat menghubungi server AI. Silakan coba lagi." }])
 } finally {
 setIsLoading(false)
 }
 }

 // Format the text so **bold** shows up
 const formatText = (text: string) => {
 if (!text) return [];
 const parts = text.split(/(\*\*.*?\*\*)/g)
 return parts.map((part, i) => {
 if (part.startsWith('**') && part.endsWith('**')) {
 return <strong key={i} className="font-bold text-primary">{part.slice(2, -2)}</strong>
 }
 return part
 })
 }

 return (
 <div className="flex h-[calc(100vh-6rem)] max-w-7xl mx-auto rounded-2xl overflow-hidden border border-border bg-card dark:bg-[#0f172a] shadow-xl animate-in fade-in duration-500">
 


 {/* Main Chat Area */}
 <div className="flex-1 flex flex-col h-full bg-[#f8fafc] dark:bg-[#0b1120]">
 {/* Header */}
 <div className="h-16 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0 px-6 bg-card dark:bg-[#0f172a]">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
 <Bot className="w-6 h-6" />
 </div>
 <div>
 <h2 className="font-bold text-foreground dark:text-white">Boostup AI Assistant</h2>
 <div className="flex items-center gap-1.5 text-xs text-primary dark:text-primary">
 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
 Online & Siap Membantu
 </div>
 </div>
 </div>
 <Button variant="outline" size="sm" className="gap-2 border-indigo-200 text-primary hover:bg-indigo-50 dark:border-indigo-900 dark:text-primary dark:hover:bg-indigo-900/30">
 <Sparkles className="w-4 h-4" /> Generate Report
 </Button>
 </div>

 {/* Chat Messages */}
 <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
 {messages.map((msg, i) => (
 <div key={i} className={`flex gap-4 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
 <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white ${
 msg.role === 'user' ? 'bg-slate-800 ' : 'bg-indigo-600 shadow-md shadow-indigo-600/30'
 }`}>
 {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
 </div>
 <div className="flex flex-col gap-1">
 <div className={`text-xs font-semibold ${msg.role === 'user' ? 'text-right text-muted-foreground' : 'text-left text-muted-foreground'}`}>
 {msg.role === 'user' ? 'Anda' : 'Boostup AI'} <span className="font-normal opacity-70 ml-1">{new Date().toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}</span>
 </div>
 <div className={`p-4 rounded-2xl text-[15px] leading-relaxed shadow-sm ${
 msg.role === 'user' 
 ? 'bg-indigo-600 text-white rounded-tr-sm' 
 : 'bg-card border border-border dark:bg-[#1e293b] dark:border-border text-foreground rounded-tl-sm'
 }`}>
 {formatText(msg.content).map((el, i) => (
 typeof el === 'string' ? <span key={i} dangerouslySetInnerHTML={{ __html: el.replace(/\n/g, '<br/>') }} /> : el
 ))}
 </div>
 </div>
 </div>
 ))}
 
 {isLoading && (
 <div className="flex gap-4 max-w-[85%] animate-pulse">
 <div className="shrink-0 w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white">
 <Bot className="w-4 h-4" />
 </div>
 <div className="p-4 rounded-2xl bg-card dark:bg-[#1e293b] border border-border rounded-tl-sm w-32 flex items-center justify-center gap-1.5">
 <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
 <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
 <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
 </div>
 </div>
 )}
 <div ref={messagesEndRef} />
 </div>

 {/* Input Area */}
 <div className="p-4 bg-card dark:bg-[#0f172a] border-t border-border">
 <form onSubmit={handleSend} className="relative flex items-center">
 <Input 
 value={input}
 onChange={(e) => setInput(e.target.value)}
 placeholder="Tanya AI untuk menganalisis performa toko, prediksi stok, atau cek kas masuk..." 
 className="pr-12 h-14 bg-muted/50 dark:bg-[#1e293b] border-transparent focus-visible:ring-indigo-500 focus-visible:border-indigo-500 rounded-xl"
 disabled={isLoading}
 />
 <Button 
 type="submit" 
 size="icon" 
 disabled={isLoading || !input.trim()}
 className="absolute right-2 w-10 h-10 rounded-lg transition-all shadow-md"
 >
 <Send className="w-4 h-4 ml-1" />
 </Button>
 </form>
 <div className="text-center mt-2 text-[10px] text-muted-foreground">
 Boostup AI dapat membuat kesalahan. Harap periksa kembali analisis data kritikal.
 </div>
 </div>
 </div>
 </div>
 )
}

