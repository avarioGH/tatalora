"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Sparkles, Bot, ShieldCheck, CheckCircle2, Save, Database, History, RefreshCw } from "lucide-react"

export default function SettingsAi() {
  const [enableAiAssistant, setEnableAiAssistant] = useState(true)
  const [allowFinancialAccess, setAllowFinancialAccess] = useState(true)
  const [allowStockAccess, setAllowStockAccess] = useState(true)
  const [requireApprovalForActions, setRequireApprovalForActions] = useState(true)
  const [selectedModel, setSelectedModel] = useState("agnes-3.0-flash")
  const [saved, setSaved] = useState(false)

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Sparkles className="w-7 h-7 text-indigo-600" />
            Konfigurasi Tatalora AI Assistant
          </h1>
          <p className="text-muted-foreground text-sm">
            Atur integrasi model kecerdasan buatan, akses data database, dan izin eksekusi aksi otomatis.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <Card className="border shadow-xs">
          <CardHeader className="border-b bg-muted/20">
            <CardTitle className="text-base flex items-center gap-2">
              <Bot className="w-4 h-4 text-indigo-600" />
              Status & Model Bahasa AI
            </CardTitle>
            <CardDescription>
              Tatalora AI terhubung secara live ke database ERP untuk menjawab analisis keuangan dan operasional.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/20">
              <div className="space-y-0.5">
                <Label className="font-semibold text-foreground">Aktifkan Floating AI Assistant</Label>
                <p className="text-xs text-muted-foreground">Menampilkan tombol bantuan AI di pojok kanan bawah seluruh halaman.</p>
              </div>
              <Switch checked={enableAiAssistant} onCheckedChange={setEnableAiAssistant} />
            </div>

            <div className="space-y-2 max-w-sm">
              <Label className="font-semibold">Model AI Default</Label>
              <select 
                value={selectedModel} 
                onChange={e => setSelectedModel(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="agnes-3.0-flash">Agnes 3.0 Flash (Sangat Cepat & Akurat)</option>
                <option value="agnes-2.5-flash">Agnes 2.5 Flash</option>
                <option value="gpt-oss:120b">GPT-OSS 120B (Analisis Kompleks)</option>
                <option value="mistral-large">Mistral Large</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-xs">
          <CardHeader className="border-b bg-muted/20">
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-600" />
              Batasan Akses Data & Otorisasi Aksi
            </CardTitle>
            <CardDescription>
              Tentukan modul data mana yang boleh dibaca dan dianalisis oleh AI.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/20">
              <div className="space-y-0.5">
                <Label className="font-semibold text-foreground">Akses Kas, Bank & Subledger Utang/Piutang</Label>
                <p className="text-xs text-muted-foreground">Izinkan AI membaca saldo kas dan daftar utang vendor aktif untuk menjawab pertanyaan keuangan.</p>
              </div>
              <Switch checked={allowFinancialAccess} onCheckedChange={setAllowFinancialAccess} />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/20">
              <div className="space-y-0.5">
                <Label className="font-semibold text-foreground">Akses Stok Persediaan & Penerimaan Barang</Label>
                <p className="text-xs text-muted-foreground">Izinkan AI membaca kuantitas stok produk di masing-masing gudang.</p>
              </div>
              <Switch checked={allowStockAccess} onCheckedChange={setAllowStockAccess} />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/20">
              <div className="space-y-0.5">
                <Label className="font-semibold text-foreground">Wajibkan Persetujuan Manual untuk Perubahan Data</Label>
                <p className="text-xs text-muted-foreground">AI tidak boleh mengubah harga atau menambah transaksi tanpa konfirmasi klik pengguna di layar.</p>
              </div>
              <Switch checked={requireApprovalForActions} onCheckedChange={setRequireApprovalForActions} />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 items-center">
          {saved && (
            <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Konfigurasi AI berhasil disimpan!
            </span>
          )}
          <Button type="submit" className="bg-primary text-primary-foreground gap-2">
            <Save className="w-4 h-4" /> Simpan Konfigurasi AI
          </Button>
        </div>
      </form>
    </div>
  )
}
