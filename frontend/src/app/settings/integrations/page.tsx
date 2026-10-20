"use client"

import { useState, useEffect } from"react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from"@/components/ui/card"
import { Button } from"@/components/ui/button"
import { Input } from"@/components/ui/input"
import { Label } from"@/components/ui/label"
import { AlertCircle, CheckCircle2, ShoppingBag, RefreshCw } from"lucide-react"
import { api } from"@/lib/api"
import { Alert, AlertDescription, AlertTitle } from"@/components/ui/alert"

export default function IntegrationsPage() {
 const [loading, setLoading] = useState(true)
 const [saving, setSaving] = useState(false)
 const [syncing, setSyncing] = useState(false)
 const [status, setStatus] = useState<any>(null)
 
 const [formData, setFormData] = useState({
 partnerId:"",
 partnerKey:""
 })

 useEffect(() => {
 fetchStatus()
 }, [])

 const fetchStatus = async () => {
 try {
 setLoading(true)
 const res = await api.get('/integrations/shopee/status')
 setStatus(res.data)
 if (res.data.partnerId) {
 setFormData(prev => ({ ...prev, partnerId: res.data.partnerId }))
 }
 } catch (e) {
 console.error(e)
 } finally {
 setLoading(false)
 }
 }

 const handleSaveCredentials = async (e: React.FormEvent) => {
 e.preventDefault()
 try {
 setSaving(true)
 await api.post('/integrations/shopee/save-credentials', formData)
 alert("Kredensial berhasil disimpan.")
 fetchStatus()
 } catch (e) {
 console.error(e)
 alert("Gagal menyimpan kredensial.")
 } finally {
 setSaving(false)
 }
 }

 const handleConnect = async () => {
 try {
 const res = await api.post('/integrations/shopee/auth-url')
 if (res.data.url) {
 // In a real app, we would redirect the user:
 // window.location.href = res.data.url
 // For demonstration, we will simulate the callback success directly
 alert(`Sistem akan mengarahkan Anda ke: \n${res.data.url}\n\n(Simulasi: Otorisasi berhasil!)`)
 await api.post('/integrations/shopee/callback', { code: 'mock_code', shop_id: 'mock_shop_123' })
 fetchStatus()
 }
 } catch (e: any) {
 alert(e.response?.data?.message ||"Gagal mendapatkan URL Otorisasi.")
 }
 }

 const handleSync = async () => {
 try {
 setSyncing(true)
 const res = await api.post('/integrations/shopee/sync-orders')
 alert(`Sinkronisasi berhasil! ${res.data.synced_orders} pesanan ditarik sebesar Rp ${res.data.total_amount.toLocaleString('id-ID')}`)
 } catch (e: any) {
 alert(e.response?.data?.message ||"Gagal melakukan sinkronisasi.")
 } finally {
 setSyncing(false)
 }
 }

 return (
 <div className="space-y-6 max-w-4xl mx-auto pb-10 animate-in fade-in duration-500">
 <div>
 <h1 className="text-[28px] font-bold tracking-tight text-foreground">Integrasi Sistem</h1>
 <p className="text-muted-foreground">Hubungkan ERP Boostup dengan platform pihak ketiga.</p>
 </div>

 <Card className="border-t-4 border-t-orange-500 shadow-md">
 <CardHeader className="flex flex-row items-center justify-between pb-2">
 <div className="space-y-1">
 <CardTitle className="flex items-center gap-2">
 <ShoppingBag className="w-5 h-5 text-orange-500" />
 Shopee Open Platform
 </CardTitle>
 <CardDescription>Otomatisasi penarikan pesanan dan mutasi saldo Shopee ke Modul Keuangan.</CardDescription>
 </div>
 {status?.isConnected ? (
 <span className="flex items-center text-sm font-medium text-primary bg-emerald-50 px-2 py-1 rounded-md">
 <CheckCircle2 className="w-4 h-4 mr-1" /> Terhubung
 </span>
 ) : (
 <span className="flex items-center text-sm font-medium text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
 <AlertCircle className="w-4 h-4 mr-1" /> Belum Terhubung
 </span>
 )}
 </CardHeader>
 <CardContent className="space-y-6 pt-4">
 
 {!status?.isConnected && (
 <Alert>
 <AlertCircle className="h-4 w-4" />
 <AlertTitle>Penting</AlertTitle>
 <AlertDescription>
 Anda memerlukan Partner ID dan Partner Key dari Shopee Open Platform Console. Jika Anda belum disetujui, Anda tetap bisa menyimpan kredensial dan melakukan simulasi sinkronisasi.
 </AlertDescription>
 </Alert>
 )}

 <form onSubmit={handleSaveCredentials} className="space-y-4 border p-4 rounded-lg bg-muted/30/50">
 <h3 className="font-medium text-sm">Pengaturan Kredensial API</h3>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="space-y-2">
 <Label>Partner ID</Label>
 <Input 
 placeholder="Masukkan Partner ID"
 value={formData.partnerId}
 onChange={e => setFormData({...formData, partnerId: e.target.value})}
 required
 disabled={status?.isConnected}
 />
 </div>
 <div className="space-y-2">
 <Label>Partner Key</Label>
 <Input 
 type="password"
 placeholder="Masukkan Partner Key"
 value={formData.partnerKey}
 onChange={e => setFormData({...formData, partnerKey: e.target.value})}
 required
 disabled={status?.isConnected}
 />
 </div>
 </div>
 
 {!status?.isConnected && (
 <div className="flex justify-end pt-2">
 <Button type="submit" disabled={saving}>
 {saving ? 'Menyimpan...' : 'Simpan Kredensial'}
 </Button>
 </div>
 )}
 </form>

 {status?.isConfigured && !status?.isConnected && (
 <div className="bg-orange-50 dark:bg-orange-950/30 p-4 rounded-lg border border-orange-100 dark:border-orange-900 flex flex-col items-center text-center space-y-3">
 <p className="text-sm text-orange-800 dark:text-orange-200">
 Kredensial tersimpan. Langkah selanjutnya adalah melakukan otorisasi toko Anda di Shopee.
 </p>
 <Button onClick={handleConnect} className="bg-orange-500 hover:bg-orange-600 text-white">
 Otorisasi Akun Shopee Sekarang
 </Button>
 </div>
 )}

 {status?.isConnected && (
 <div className="space-y-4">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="border rounded-lg p-3">
 <p className="text-xs text-muted-foreground">Shop ID Terhubung</p>
 <p className="font-mono font-medium">{status.shopId}</p>
 </div>
 <div className="border rounded-lg p-3">
 <p className="text-xs text-muted-foreground">Status Sinkronisasi</p>
 <p className="font-medium text-primary">Aktif (Setiap 1 Jam)</p>
 </div>
 </div>
 
 <div className="flex justify-end pt-4 border-t">
 <Button onClick={handleSync} disabled={syncing} variant="outline" className="flex items-center gap-2">
 <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
 {syncing ? 'Menarik Data...' : 'Tarik Data Manual'}
 </Button>
 </div>
 </div>
 )}

 </CardContent>
 </Card>
 </div>
 )
}
