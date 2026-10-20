"use client"

import React, { useState, useEffect } from "react"
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CommunicationAPI } from "@/lib/api"
import { 
  MessageSquare, Mail, FileText, History, CheckCircle2, AlertCircle, Save, RefreshCw, Key, ShieldCheck,
  Bell, Play, Eye, Clock, AlertTriangle, Calendar
} from "lucide-react"

export default function CommunicationSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [runningReminder, setRunningReminder] = useState(false)
  const [previewData, setPreviewData] = useState<any>(null)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  
  // Settings Form State
  const [settings, setSettings] = useState<any>({
    wa_enabled: false,
    wa_phone_number_id: "",
    wa_business_id: "",
    wa_sender_phone: "",
    wa_access_token: "",
    wa_has_token: false,
    email_enabled: false,
    email_provider: "SMTP",
    email_sender_name: "TATALORA ERP",
    email_sender_addr: "",
    email_reply_to: "",
    email_smtp_host: "",
    email_smtp_port: 587,
    email_smtp_user: "",
    email_smtp_pass: "",
    email_has_pass: false,
    email_smtp_secure: false,
    // Automated Reminder Settings
    reminder_enabled: false,
    reminder_channels: "WHATSAPP,EMAIL",
    reminder_days_before: 3,
    reminder_on_due_date: true,
    reminder_days_after: 3,
    reminder_time: "09:00",
    reminder_last_run: null,
    reminder_last_status: "IDLE",
    reminder_last_count: 0,
    reminder_last_error: null,
  })

  // Templates State
  const [templates, setTemplates] = useState<any[]>([])
  const [selectedTpl, setSelectedTpl] = useState<any>(null)
  const [tplForm, setTplForm] = useState({ name: "", channel: "WHATSAPP", subject: "", body: "" })

  // History Logs State
  const [logs, setLogs] = useState<any[]>([])

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    try {
      setLoading(true)
      const [sData, tData, lData] = await Promise.all([
        CommunicationAPI.getSettings().catch(() => null),
        CommunicationAPI.getTemplates().catch(() => []),
        CommunicationAPI.getLogs({ take: 20 }).catch(() => []),
      ])

      if (sData) setSettings(sData)
      if (tData) {
        setTemplates(tData)
        if (tData.length > 0) {
          setSelectedTpl(tData[0])
          setTplForm({
            name: tData[0].name,
            channel: tData[0].channel,
            subject: tData[0].subject || "",
            body: tData[0].body || "",
          })
        }
      }
      if (lData) setLogs(lData)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSaving(true)
      await CommunicationAPI.saveSettings(settings)
      alert("Pengaturan integrasi pesan & email berhasil disimpan!")
      loadAll()
    } catch (err: any) {
      alert("Gagal menyimpan: " + (err.response?.data?.message || err.message))
    } finally {
      setSaving(false)
    }
  }

  const handleRunReminders = async () => {
    if (!confirm("Jalankan otomatisasi pengingat faktur sekarang untuk seluruh tagihan yang jatuh tempo?")) return
    try {
      setRunningReminder(true)
      const res = await CommunicationAPI.runReminders({ forceSend: true })
      alert(`Eksekusi selesai! Terkirim: ${res.sent}, Dilewati: ${res.skipped}, Gagal: ${res.failed}.`)
      loadAll()
    } catch (err: any) {
      alert("Gagal menjalankan pengingat: " + (err.response?.data?.message || err.message))
    } finally {
      setRunningReminder(false)
    }
  }

  const handlePreviewReminders = async () => {
    try {
      setRunningReminder(true)
      const res = await CommunicationAPI.previewReminders()
      setPreviewData(res)
      setShowPreviewModal(true)
    } catch (err: any) {
      alert("Gagal memuat pratinjau: " + (err.response?.data?.message || err.message))
    } finally {
      setRunningReminder(false)
    }
  }

  const handleSelectTemplate = (tpl: any) => {
    setSelectedTpl(tpl)
    setTplForm({
      name: tpl.name,
      channel: tpl.channel,
      subject: tpl.subject || "",
      body: tpl.body || "",
    })
  }

  const handleSaveTemplate = async () => {
    try {
      setSaving(true)
      await CommunicationAPI.saveTemplate(tplForm)
      alert("Template pesan berhasil diperbarui!")
      loadAll()
    } catch (err: any) {
      alert("Gagal menyimpan template: " + (err.response?.data?.message || err.message))
    } finally {
      setSaving(false)
    }
  }

  const availableVariables = [
    { key: "{{customer_name}}", label: "Nama Pelanggan" },
    { key: "{{company_name}}", label: "Nama Perusahaan" },
    { key: "{{document_number}}", label: "Nomor Faktur" },
    { key: "{{document_date}}", label: "Tanggal Faktur" },
    { key: "{{due_date}}", label: "Jatuh Tempo" },
    { key: "{{total_amount}}", label: "Total Faktur" },
    { key: "{{outstanding_amount}}", label: "Sisa Tagihan" },
    { key: "{{document_link}}", label: "Tautan Faktur Online" },
  ]

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Memuat konfigurasi integrasi pesan & template...</div>
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-6xl mx-auto pb-24">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-lg">
              <MessageSquare className="h-6 w-6 text-indigo-600" />
            </div>
            Pengaturan Template & Integrasi Pesan
          </h1>
          <p className="text-muted-foreground mt-1">
            Konfigurasi Meta WhatsApp Business API, Pengiriman Email SMTP, Template Notifikasi, dan Riwayat Komunikasi.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadAll} className="gap-2">
          <RefreshCw className="w-4 h-4" /> Segarkan
        </Button>
      </div>

      <Tabs defaultValue="whatsapp" className="space-y-6">
        <TabsList className="bg-muted p-1 border border-border flex flex-wrap h-auto gap-1">
          <TabsTrigger value="reminders" className="gap-2">
            <Bell className="w-4 h-4 text-amber-500" /> Pengingat Otomatis
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="gap-2">
            <MessageSquare className="w-4 h-4" /> WhatsApp API
          </TabsTrigger>
          <TabsTrigger value="email" className="gap-2">
            <Mail className="w-4 h-4" /> Email Provider
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <FileText className="w-4 h-4" /> Template Pesan
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="w-4 h-4" /> Riwayat Pengiriman
          </TabsTrigger>
        </TabsList>

        {/* 1. WHATSAPP SETTINGS */}
        <TabsContent value="whatsapp" className="space-y-6">
          <Card className="border-border">
            <CardHeader className="border-b border-border bg-muted/20">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-emerald-600" /> WhatsApp Business Cloud API (Meta)
                  </CardTitle>
                  <CardDescription>
                    Kirim faktur dan pengingat resmi langsung dari akun WhatsApp Business centang/resmi perusahaan Anda.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <Label htmlFor="wa-active" className="text-sm font-semibold cursor-pointer">
                    {settings.wa_enabled ? "Aktif" : "Non-Aktif"}
                  </Label>
                  <Switch 
                    id="wa-active" 
                    checked={settings.wa_enabled} 
                    onCheckedChange={(checked) => setSettings({ ...settings, wa_enabled: checked })} 
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 text-sm flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-600" />
                <div>
                  <span className="font-semibold">Kerahasiaan Terjamin:</span> Token akses dan kredensial Meta Anda dienkripsi secara aman menggunakan AES-256-GCM tingkat perbankan dan tidak akan pernah dibocorkan ke sisi peramban (browser).
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <Label>Phone Number ID (Meta Developer)</Label>
                  <Input 
                    placeholder="Contoh: 104829104928102" 
                    value={settings.wa_phone_number_id}
                    onChange={(e) => setSettings({ ...settings, wa_phone_number_id: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>WABA Account / Business ID</Label>
                  <Input 
                    placeholder="Contoh: 284910294819201" 
                    value={settings.wa_business_id}
                    onChange={(e) => setSettings({ ...settings, wa_business_id: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nomor WhatsApp Pengirim Resmi</Label>
                  <Input 
                    placeholder="Contoh: +62 812-3456-7890" 
                    value={settings.wa_sender_phone}
                    onChange={(e) => setSettings({ ...settings, wa_sender_phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center justify-between">
                    <span>Permanent / System User Access Token</span>
                    {settings.wa_has_token && <Badge variant="outline" className="text-emerald-600 border-emerald-200">Tersimpan</Badge>}
                  </Label>
                  <Input 
                    type="password"
                    placeholder={settings.wa_has_token ? "•••••••••••••••• (Isi hanya jika ingin mengganti)" : "EAAB..."}
                    value={settings.wa_access_token}
                    onChange={(e) => setSettings({ ...settings, wa_access_token: e.target.value })}
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <Button onClick={handleSaveSettings} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                  <Save className="w-4 h-4" /> Simpan Pengaturan WhatsApp
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. EMAIL SETTINGS */}
        <TabsContent value="email" className="space-y-6">
          <Card className="border-border">
            <CardHeader className="border-b border-border bg-muted/20">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Mail className="w-5 h-5 text-indigo-600" /> Konfigurasi Pengiriman Email
                  </CardTitle>
                  <CardDescription>
                    Kirim faktur penjualan beserta lampiran dokumen PDF resmi ke email pelanggan via SMTP perusahaan.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <Label htmlFor="email-active" className="text-sm font-semibold cursor-pointer">
                    {settings.email_enabled ? "Aktif" : "Non-Aktif"}
                  </Label>
                  <Switch 
                    id="email-active" 
                    checked={settings.email_enabled} 
                    onCheckedChange={(checked) => setSettings({ ...settings, email_enabled: checked })} 
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nama Pengirim (Display Name)</Label>
                  <Input 
                    value={settings.email_sender_name}
                    onChange={(e) => setSettings({ ...settings, email_sender_name: e.target.value })}
                    placeholder="TATALORA Billing Team"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Alamat Email Pengirim</Label>
                  <Input 
                    value={settings.email_sender_addr}
                    onChange={(e) => setSettings({ ...settings, email_sender_addr: e.target.value })}
                    placeholder="billing@tatalora.id"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Reply-To Address</Label>
                  <Input 
                    value={settings.email_reply_to}
                    onChange={(e) => setSettings({ ...settings, email_reply_to: e.target.value })}
                    placeholder="support@tatalora.id"
                  />
                </div>
                <div className="space-y-2">
                  <Label>SMTP Host</Label>
                  <Input 
                    value={settings.email_smtp_host}
                    onChange={(e) => setSettings({ ...settings, email_smtp_host: e.target.value })}
                    placeholder="smtp.gmail.com / mail.tatalora.id"
                  />
                </div>
                <div className="space-y-2">
                  <Label>SMTP Port</Label>
                  <Input 
                    type="number"
                    value={settings.email_smtp_port}
                    onChange={(e) => setSettings({ ...settings, email_smtp_port: parseInt(e.target.value, 10) || 587 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>SMTP Username</Label>
                  <Input 
                    value={settings.email_smtp_user}
                    onChange={(e) => setSettings({ ...settings, email_smtp_user: e.target.value })}
                    placeholder="apikey / user@domain.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center justify-between">
                    <span>SMTP Password / App Key</span>
                    {settings.email_has_pass && <Badge variant="outline" className="text-emerald-600 border-emerald-200">Tersimpan</Badge>}
                  </Label>
                  <Input 
                    type="password"
                    placeholder={settings.email_has_pass ? "•••••••••••• (Isi hanya jika ingin mengganti)" : "Password atau API Key"}
                    value={settings.email_smtp_pass}
                    onChange={(e) => setSettings({ ...settings, email_smtp_pass: e.target.value })}
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <Button onClick={handleSaveSettings} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                  <Save className="w-4 h-4" /> Simpan Pengaturan Email
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. TEMPLATES */}
        <TabsContent value="templates" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Template Selector List */}
            <Card className="border-border md:col-span-1">
              <CardHeader className="border-b border-border bg-muted/20 pb-3">
                <CardTitle className="text-base">Daftar Template</CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-2">
                {templates.map((tpl) => (
                  <div
                    key={tpl.id}
                    onClick={() => handleSelectTemplate(tpl)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedTpl?.id === tpl.id ? "bg-indigo-50 border-indigo-300 text-indigo-900" : "bg-card border-border hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm">{tpl.name}</span>
                      <Badge variant="outline" className="text-[10px]">{tpl.channel}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{tpl.subject || tpl.body}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Template Editor */}
            <Card className="border-border md:col-span-2">
              <CardHeader className="border-b border-border bg-muted/20">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Edit Template Pesan</span>
                  <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 border-0">{tplForm.channel}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label>Nama Template</Label>
                  <Input value={tplForm.name} readOnly className="bg-muted text-muted-foreground" />
                </div>

                {tplForm.channel === "EMAIL" && (
                  <div className="space-y-2">
                    <Label>Subjek Email</Label>
                    <Input 
                      value={tplForm.subject}
                      onChange={(e) => setTplForm({ ...tplForm, subject: e.target.value })}
                      placeholder="Tagihan {{document_number}} dari {{company_name}}"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Isi Pesan Template</Label>
                  <Textarea 
                    rows={8}
                    value={tplForm.body}
                    onChange={(e) => setTplForm({ ...tplForm, body: e.target.value })}
                    className="font-mono text-sm leading-relaxed"
                  />
                </div>

                {/* Available Variables Helper */}
                <div className="p-4 bg-muted/40 rounded-lg border border-border space-y-2">
                  <span className="text-xs font-semibold text-foreground uppercase tracking-wider block">
                    Variabel Dinamis yang Tersedia (Klik untuk Menyisipkan)
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {availableVariables.map((v) => (
                      <button
                        key={v.key}
                        type="button"
                        onClick={() => setTplForm({ ...tplForm, body: tplForm.body + " " + v.key })}
                        className="px-2 py-1 rounded bg-card hover:bg-indigo-50 hover:text-indigo-600 border border-border text-xs text-muted-foreground transition-colors"
                      >
                        <code>{v.key}</code> ({v.label})
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button onClick={handleSaveTemplate} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                    <Save className="w-4 h-4" /> Simpan Perubahan Template
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 4. HISTORY */}
        <TabsContent value="history" className="space-y-6">
          <Card className="border-border">
            <CardHeader className="border-b border-border bg-muted/20">
              <CardTitle className="text-base">Audit Trail Pengiriman Dokumen</CardTitle>
              <CardDescription>
                Log jejak pengiriman pesan dan faktur yang dilakukan oleh staf ke pelanggan.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 border-b border-border text-muted-foreground text-xs uppercase">
                    <tr>
                      <th className="p-3">Waktu</th>
                      <th className="p-3">No. Dokumen</th>
                      <th className="p-3">Saluran</th>
                      <th className="p-3">Penerima</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Reference / Provider ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {logs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground">
                          Belum ada riwayat pengiriman dokumen.
                        </td>
                      </tr>
                    ) : (
                      logs.map((log) => (
                        <tr key={log.id} className="hover:bg-muted/20">
                          <td className="p-3 text-muted-foreground whitespace-nowrap">
                            {new Date(log.created_at).toLocaleString("id-ID")}
                          </td>
                          <td className="p-3 font-semibold text-foreground">{log.document_no}</td>
                          <td className="p-3">
                            <Badge variant="outline" className="text-xs">
                              {log.channel === "WHATSAPP" ? "WhatsApp API" : log.channel === "WHATSAPP_MANUAL" ? "WhatsApp Web" : "Email"}
                            </Badge>
                          </td>
                          <td className="p-3">{log.recipient}</td>
                          <td className="p-3">
                            <Badge className={
                              log.status === "SENT" || log.status === "DELIVERED" ? "bg-emerald-500/10 text-emerald-600 border-0" :
                              log.status === "FAILED" ? "bg-rose-500/10 text-rose-600 border-0" :
                              "bg-amber-500/10 text-amber-600 border-0"
                            }>
                              {log.status}
                            </Badge>
                          </td>
                          <td className="p-3 font-mono text-xs text-muted-foreground">{log.provider_id || log.error_message || "-"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 5. AUTOMATED INVOICE REMINDERS */}
        <TabsContent value="reminders" className="space-y-6">
          <Card className="border-border">
            <CardHeader className="border-b border-border bg-muted/20">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Bell className="w-5 h-5 text-amber-500" /> Otomatisasi Pengingat Faktur Penjualan
                  </CardTitle>
                  <CardDescription>
                    Kirim pengingat otomatis kepada pelanggan saat faktur mendekati, tepat, atau telah melewati tanggal jatuh tempo.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <Label htmlFor="reminder-active" className="text-sm font-semibold cursor-pointer">
                    {settings.reminder_enabled ? "Aktif" : "Non-Aktif"}
                  </Label>
                  <Switch 
                    id="reminder-active" 
                    checked={settings.reminder_enabled} 
                    onCheckedChange={(checked) => setSettings({ ...settings, reminder_enabled: checked })} 
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Alert Info Integritas Finansial */}
              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-700 text-sm flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 flex-shrink-0 mt-0.5 text-blue-600" />
                <div>
                  <span className="font-semibold">Integritas Finansial Terjamin:</span> Otomatisasi pengingat bersifat hanya-baca (read-only) terhadap data finansial. Sistem tidak pernah mengubah status tagihan, tidak memodifikasi sisa saldo, dan tidak membuat mutasi kas/bank atau jurnal akuntansi.
                </div>
              </div>

              {/* Saluran Pengiriman */}
              <div className="space-y-3">
                <Label className="text-sm font-bold text-foreground">Saluran Pengiriman Pengingat</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-card">
                    <div className="flex items-center gap-3">
                      <MessageSquare className="w-5 h-5 text-emerald-600" />
                      <div>
                        <div className="font-medium text-sm">WhatsApp</div>
                        <div className="text-xs text-muted-foreground">Via Meta Cloud API atau Web</div>
                      </div>
                    </div>
                    <Switch
                      checked={(settings.reminder_channels || "").includes("WHATSAPP")}
                      onCheckedChange={(checked) => {
                        const current = (settings.reminder_channels || "").split(",").filter((c: string) => c.trim().length > 0);
                        const next = checked ? Array.from(new Set([...current, "WHATSAPP"])) : current.filter((c: string) => c !== "WHATSAPP");
                        setSettings({ ...settings, reminder_channels: next.join(",") });
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg bg-card">
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-indigo-600" />
                      <div>
                        <div className="font-medium text-sm">Email (SMTP)</div>
                        <div className="text-xs text-muted-foreground">Dengan lampiran PDF faktur</div>
                      </div>
                    </div>
                    <Switch
                      checked={(settings.reminder_channels || "").includes("EMAIL")}
                      onCheckedChange={(checked) => {
                        const current = (settings.reminder_channels || "").split(",").filter((c: string) => c.trim().length > 0);
                        const next = checked ? Array.from(new Set([...current, "EMAIL"])) : current.filter((c: string) => c !== "EMAIL");
                        setSettings({ ...settings, reminder_channels: next.join(",") });
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Aturan Jadwal & Tahapan Pengingat */}
              <div className="space-y-4 pt-2 border-t border-border">
                <Label className="text-sm font-bold text-foreground">Aturan & Tahapan Jadwal Pengingat</Label>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Tahap 1: Sebelum Jatuh Tempo */}
                  <div className="p-4 border rounded-lg bg-muted/10 space-y-3">
                    <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
                      <Calendar className="w-4 h-4 text-amber-500" />
                      Sebelum Jatuh Tempo (H-)
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Kirim pemberitahuan awal sebelum batas waktu pembayaran tiba.
                    </p>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="1"
                        max="30"
                        className="w-20"
                        value={settings.reminder_days_before ?? 3}
                        onChange={(e) => setSettings({ ...settings, reminder_days_before: Number(e.target.value) })}
                      />
                      <span className="text-xs text-muted-foreground">Hari Sebelum</span>
                    </div>
                  </div>

                  {/* Tahap 2: Hari H Jatuh Tempo */}
                  <div className="p-4 border rounded-lg bg-muted/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
                        <Clock className="w-4 h-4 text-blue-500" />
                        Hari H Jatuh Tempo (D-0)
                      </div>
                      <Switch
                        checked={settings.reminder_on_due_date ?? true}
                        onCheckedChange={(checked) => setSettings({ ...settings, reminder_on_due_date: checked })}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Kirim pengingat prioritas pada hari tanggal jatuh tempo pembayaran.
                    </p>
                    <div className="text-xs font-medium text-emerald-600">
                      {settings.reminder_on_due_date ? "✓ Aktif pada Hari H" : "✕ Dinonaktifkan"}
                    </div>
                  </div>

                  {/* Tahap 3: Melewati Jatuh Tempo */}
                  <div className="p-4 border rounded-lg bg-muted/10 space-y-3">
                    <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
                      <AlertTriangle className="w-4 h-4 text-rose-500" />
                      Melewati Jatuh Tempo (H+)
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Kirim pemberitahuan tagihan tertunggak (overdue).
                    </p>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="1"
                        max="60"
                        className="w-20"
                        value={settings.reminder_days_after ?? 3}
                        onChange={(e) => setSettings({ ...settings, reminder_days_after: Number(e.target.value) })}
                      />
                      <span className="text-xs text-muted-foreground">Hari Setelah (Overdue)</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-2">
                    <Label className="text-xs">Waktu Eksekusi Harian</Label>
                    <Input
                      type="time"
                      value={settings.reminder_time || "09:00"}
                      onChange={(e) => setSettings({ ...settings, reminder_time: e.target.value })}
                    />
                    <p className="text-[11px] text-muted-foreground">Sistem scheduler memeriksa tagihan sesuai zona waktu perusahaan Anda.</p>
                  </div>
                </div>
              </div>

              {/* Diagnostik & Status Eksekusi Terakhir */}
              <div className="p-4 rounded-lg border border-border bg-muted/20 space-y-3">
                <div className="font-semibold text-sm text-foreground flex items-center justify-between">
                  <span>Diagnostik & Riwayat Eksekusi Scheduler</span>
                  <Badge className={
                    settings.reminder_last_status === "SUCCESS" ? "bg-emerald-500/10 text-emerald-600 border-0" :
                    settings.reminder_last_status === "PARTIAL" ? "bg-amber-500/10 text-amber-600 border-0" :
                    settings.reminder_last_status === "FAILED" ? "bg-rose-500/10 text-rose-600 border-0" :
                    "bg-muted text-muted-foreground border-0"
                  }>
                    {settings.reminder_last_status || "IDLE"}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground">Terakhir Dijalankan:</span>
                    <div className="font-semibold text-foreground">
                      {settings.reminder_last_run ? new Date(settings.reminder_last_run).toLocaleString("id-ID") : "Belum pernah"}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Pesan Terkirim Terakhir:</span>
                    <div className="font-semibold text-foreground">{settings.reminder_last_count ?? 0} Pesan</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Pencegahan Duplikasi (Idempotensi):</span>
                    <div className="font-semibold text-emerald-600">Aktif & Terisolasi Per-Tenant</div>
                  </div>
                </div>

                {settings.reminder_last_error && (
                  <div className="p-2.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-700 text-xs">
                    <span className="font-semibold">Catatan Diagnostik:</span> {settings.reminder_last_error}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border">
                <div className="flex items-center gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={handlePreviewReminders}
                    disabled={runningReminder}
                    className="gap-2"
                  >
                    <Eye className="w-4 h-4 text-blue-500" />
                    {runningReminder ? "Memeriksa..." : "Pratinjau Pengingat Hari Ini"}
                  </Button>

                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={handleRunReminders}
                    disabled={runningReminder}
                    className="gap-2 text-amber-600 hover:text-amber-700 border-amber-500/30 hover:bg-amber-500/10"
                  >
                    <Play className="w-4 h-4" />
                    {runningReminder ? "Menjalankan..." : "Jalankan Pengingat Sekarang"}
                  </Button>
                </div>

                <Button onClick={handleSaveSettings} disabled={saving} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
                  <Save className="w-4 h-4" />
                  {saving ? "Menyimpan..." : "Simpan Pengaturan Pengingat"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MODAL PRATINJAU PENGINGAT HARI INI */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-lg text-foreground">Pratinjau Pengingat Hari Ini</h3>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowPreviewModal(false)}>✕</Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Berikut adalah daftar faktur penjualan yang memenuhi kriteria pengingat saat ini berdasarkan zona waktu dan saldo sisa tagihan.
            </p>

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted text-muted-foreground border-b">
                  <tr>
                    <th className="p-2.5">No Faktur</th>
                    <th className="p-2.5">Pelanggan</th>
                    <th className="p-2.5">Jatuh Tempo</th>
                    <th className="p-2.5">Tahap</th>
                    <th className="p-2.5 text-right">Sisa Tagihan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(!previewData?.details || previewData.details.length === 0) ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-muted-foreground">
                        Tidak ada faktur yang memenuhi jadwal pengingat untuk hari ini.
                      </td>
                    </tr>
                  ) : (
                    previewData.details.map((item: any, idx: number) => (
                      <tr key={idx} className="hover:bg-muted/10">
                        <td className="p-2.5 font-semibold text-foreground">{item.invoiceNumber}</td>
                        <td className="p-2.5 text-muted-foreground">{item.customerName}</td>
                        <td className="p-2.5">{item.dueDate}</td>
                        <td className="p-2.5">
                          <Badge variant="outline" className={
                            item.stage === "DUE_TODAY" ? "border-amber-500 text-amber-600 font-semibold" :
                            item.stage === "OVERDUE" ? "border-rose-500 text-rose-600 font-semibold" :
                            "border-blue-500 text-blue-600"
                          }>
                            {item.stage === "DUE_TODAY" ? "Hari H" : item.stage === "OVERDUE" ? "Overdue" : "Sebelum H"}
                          </Badge>
                        </td>
                        <td className="p-2.5 text-right font-medium">Rp {(item.remainingAmount || 0).toLocaleString("id-ID")}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center pt-2 text-xs text-muted-foreground">
              <div>Total Tagihan Terdeteksi: <span className="font-bold text-foreground">{previewData?.totalEligible ?? 0}</span></div>
              <Button size="sm" onClick={() => setShowPreviewModal(false)}>Tutup Pratinjau</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
