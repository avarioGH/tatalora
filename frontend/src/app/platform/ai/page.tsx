"use client"
import { api } from"@/lib/api"

import { useState } from"react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from"@/components/ui/card"
import { Button } from"@/components/ui/button"
import { Input } from"@/components/ui/input"
import { Sparkles, Send, BrainCircuit, AlertCircle } from"lucide-react"

export default function AIInsightsPage() {
 const [prompt, setPrompt] = useState("")
 const [loading, setLoading] = useState(false)
 const [history, setHistory] = useState<{ role: 'user' | 'ai', content: string }[]>([])

 const askAi = async (e: React.FormEvent) => {
 e.preventDefault()
 if (!prompt.trim()) return

 const userMsg = prompt
 setPrompt("")
 setHistory(prev => [...prev, { role: 'user', content: userMsg }])
 setLoading(true)

 try {
 const token = localStorage.getItem("erp_token")
 const res = await api.post("/platform/ai/ask", { prompt: userMsg, contextData: { source:"ERP User Request" } })
 
 const data = res.data
 
 if ((res.status === 200 || res.status === 201) && data.success) {
 setHistory(prev => [...prev, { role: 'ai', content: data.answer ||"Processing complete." }])
 } else {
 setHistory(prev => [...prev, { role: 'ai', content:"Error communicating with AI service." }])
 }
 } catch (e) {
 console.error(e)
 setHistory(prev => [...prev, { role: 'ai', content:"Sorry, I couldn't connect to the server." }])
 } finally {
 setLoading(false)
 }
 }

 // A very simple markdown formatter to bold text wrapped in ** and handle newlines
 const formatMarkdown = (text: string) => {
 if (!text) return null;
 return text.split('\n').map((line, i) => {
 const parts = line.split(/(\*\*.*?\*\*)/g).map((part, j) => {
 if (part.startsWith('**') && part.endsWith('**')) {
 return <strong key={j} className="text-primary">{part.slice(2, -2)}</strong>
 }
 return part
 })
 return (
 <span key={i}>
 {parts}
 <br />
 </span>
 )
 })
 }

 return (
 <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto">
 <div>
 <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-2">
 <BrainCircuit className="w-8 h-8 text-primary" />
 Boostup AI Insights
 </h1>
 <p className="text-muted-foreground mt-1">
 Chat with your intelligent ERP assistant to analyze data, spot trends, and get business advice.
 </p>
 </div>

 <Card className="border-t-4 border-t-indigo-600 shadow-xl flex flex-col h-[600px]">
 <CardHeader className="bg-muted/30 border-b pb-4">
 <CardTitle className="text-[16px] font-semibold flex items-center gap-2">
 <Sparkles className="w-5 h-5 text-indigo-500" />
 AI Business Assistant
 </CardTitle>
 <CardDescription>
 Powered by Gemini 1.5 Flash. Ask anything about your business strategy.
 </CardDescription>
 </CardHeader>
 
 <CardContent className="flex-1 overflow-y-auto p-6 space-y-6">
 {history.length === 0 ? (
 <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-4">
 <BrainCircuit className="w-16 h-16 opacity-20" />
 <p>How can I help you grow your business today?</p>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-lg mt-4">
 <Button variant="outline" className="h-auto whitespace-normal p-4 text-left justify-start text-sm" onClick={() => setPrompt("What are some effective ways to reduce inventory costs?")}>
 💡 How to reduce inventory costs?
 </Button>
 <Button variant="outline" className="h-auto whitespace-normal p-4 text-left justify-start text-sm" onClick={() => setPrompt("Give me a marketing strategy to increase sales in Q4.")}>
 📈 Q4 Sales Strategy
 </Button>
 </div>
 </div>
 ) : (
 history.map((msg, index) => (
 <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
 <div 
 className={`max-w-[80%] rounded-2xl p-4 shadow-sm ${
 msg.role === 'user' 
 ? 'bg-indigo-600 text-white rounded-tr-none' 
 : 'bg-muted rounded-tl-none border'
 }`}
 >
 {msg.role === 'ai' ? (
 <div className="prose prose-sm dark:prose-invert">
 {formatMarkdown(msg.content)}
 </div>
 ) : (
 <p>{msg.content}</p>
 )}
 </div>
 </div>
 ))
 )}
 
 {loading && (
 <div className="flex justify-start">
 <div className="bg-muted rounded-2xl rounded-tl-none p-4 max-w-[80%] border flex items-center gap-3">
 <Sparkles className="w-4 h-4 animate-spin text-indigo-500" />
 <span className="text-sm text-muted-foreground animate-pulse">Boostup AI is thinking...</span>
 </div>
 </div>
 )}
 </CardContent>
 
 <div className="p-4 bg-muted/20 border-t">
 <form onSubmit={askAi} className="flex gap-2">
 <Input 
 placeholder="Ask Boostup AI about your business data..." 
 value={prompt}
 onChange={(e) => setPrompt(e.target.value)}
 className="flex-1 bg-background"
 disabled={loading}
 />
 <Button type="submit" disabled={loading || !prompt.trim()} className="">
 <Send className="w-4 h-4 mr-2" />
 Ask AI
 </Button>
 </form>
 <div className="flex items-center justify-center gap-1 mt-2 text-xs text-muted-foreground">
 <AlertCircle className="w-3 h-3" />
 AI can make mistakes. Verify important business decisions.
 </div>
 </div>
 </Card>
 </div>
 )
}
