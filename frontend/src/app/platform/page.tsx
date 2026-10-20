"use client"
import { api } from"@/lib/api"

import { useState, useEffect } from"react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from"@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from"@/components/ui/tabs"
import { Input } from"@/components/ui/input"
import { Label } from"@/components/ui/label"
import { Button } from"@/components/ui/button"

export default function PlatformDashboard() {
 const [settings, setSettings] = useState({
 companyName:"",
 currency:"IDR",
 timezone:"Asia/Jakarta",
 invoicePrefix:"INV-"
 })
 
 const [apiKeys, setApiKeys] = useState<any[]>([])
 const [newKeyName, setNewKeyName] = useState("")
 const [loading, setLoading] = useState(true)

 const fetchData = async () => {
 try {
 setLoading(true)
 
 const [setRes, keyRes] = await Promise.all([
 api.get("/platform/settings"),
 api.get("/platform/api-keys")
 ])
 
 setSettings(setRes.data)
 setApiKeys(keyRes.data)
 } catch (e) {
 console.error(e)
 } finally {
 setLoading(false)
 }
 }

 useEffect(() => {
 fetchData()
 }, [])

 const saveSettings = async (e: React.FormEvent) => {
 e.preventDefault()
 try {
 await api.post("/platform/settings", settings)
 alert("Settings saved successfully!")
 } catch (e) {
 console.error(e)
 }
 }

 const generateApiKey = async (e: React.FormEvent) => {
 e.preventDefault()
 if (!newKeyName) return
 try {
 const token = localStorage.getItem("erp_token")
 const res = await api.post("/platform/api-keys", { name: newKeyName, scopes:"all" })
 if (res.status === 200 || res.status === 201) {
 setNewKeyName("")
 fetchData()
 }
 } catch (e) {
 console.error(e)
 }
 }

 return (
 <div className="space-y-6">
 <div>
 <h1 className="text-[28px] font-bold tracking-tight text-foreground">Platform Services</h1>
 <p className="text-muted-foreground">Manage your ERP settings, API keys, and integrations.</p>
 </div>

 <Tabs defaultValue="settings" className="w-full">
 <TabsList className="grid w-full grid-cols-1 md:grid-cols-2 md:w-[400px]">
 <TabsTrigger value="settings">General Settings</TabsTrigger>
 <TabsTrigger value="apikeys">API Keys</TabsTrigger>
 </TabsList>
 
 <TabsContent value="settings" className="mt-6">
 <Card>
 <form onSubmit={saveSettings}>
 <CardHeader>
 <CardTitle>Company Profile</CardTitle>
 <CardDescription>
 Update your company details and localization preferences.
 </CardDescription>
 </CardHeader>
 <CardContent className="space-y-4">
 <div className="grid gap-2">
 <Label>Company Name</Label>
 <Input 
 value={settings.companyName ||""} 
 onChange={e => setSettings({...settings, companyName: e.target.value})} 
 />
 </div>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="grid gap-2">
 <Label>Currency</Label>
 <Input 
 value={settings.currency ||""} 
 onChange={e => setSettings({...settings, currency: e.target.value})} 
 />
 </div>
 <div className="grid gap-2">
 <Label>Timezone</Label>
 <Input 
 value={settings.timezone ||""} 
 onChange={e => setSettings({...settings, timezone: e.target.value})} 
 />
 </div>
 </div>
 <div className="grid gap-2">
 <Label>Invoice Prefix</Label>
 <Input 
 value={settings.invoicePrefix ||""} 
 onChange={e => setSettings({...settings, invoicePrefix: e.target.value})} 
 />
 </div>
 <Button type="submit">Save Changes</Button>
 </CardContent>
 </form>
 </Card>
 </TabsContent>
 
 <TabsContent value="apikeys" className="mt-6 space-y-6">
 <Card>
 <form onSubmit={generateApiKey}>
 <CardHeader>
 <CardTitle>Generate New API Key</CardTitle>
 <CardDescription>
 Create a token to authenticate 3rd-party apps with your ERP.
 </CardDescription>
 </CardHeader>
 <CardContent className="flex items-end gap-4">
 <div className="grid gap-2 flex-1">
 <Label>Key Name</Label>
 <Input 
 placeholder="e.g. WhatsApp Bot" 
 value={newKeyName} 
 onChange={e => setNewKeyName(e.target.value)} 
 required 
 />
 </div>
 <Button type="submit">Generate Token</Button>
 </CardContent>
 </form>
 </Card>

 <Card>
 <CardHeader>
 <CardTitle>Active API Keys</CardTitle>
 </CardHeader>
 <CardContent>
 {loading ? (
 <p className="text-sm text-muted-foreground">Loading...</p>
 ) : apiKeys.length === 0 ? (
 <p className="text-sm text-muted-foreground">No API keys found.</p>
 ) : (
 <div className="border rounded-md">
 <table className="min-w-[600px] md:min-w-full w-full text-sm">
 <thead>
 <tr className="border-b bg-muted/50">
 <th className="p-3 text-left font-medium">Name</th>
 <th className="p-3 text-left font-medium">Token Hash</th>
 <th className="p-3 text-left font-medium">Created At</th>
 </tr>
 </thead>
 <tbody>
 {apiKeys.map((key) => (
 <tr key={key.id} className="border-b last:border-0">
 <td className="p-3 font-medium">{key.name}</td>
 <td className="p-3 font-mono text-xs">{key.token_hash}</td>
 <td className="p-3 text-muted-foreground">
 {new Date(key.created_at).toLocaleDateString()}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </CardContent>
 </Card>
 </TabsContent>
 </Tabs>
 </div>
 )
}
