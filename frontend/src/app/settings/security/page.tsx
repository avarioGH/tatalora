"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Shield, KeyRound, Lock, UserCheck, Smartphone, Clock, CheckCircle2, Save } from "lucide-react"

export default function SettingsSecurity() {
  const [saved, setSaved] = useState(false)
  const [sessionTimeout, setSessionTimeout] = useState("120")
  const [require2FA, setRequire2FA] = useState(false)
  const [passwordMinLength, setPasswordMinLength] = useState("8")
  const [enforcePasswordComplexity, setEnforcePasswordComplexity] = useState(true)
  const [maxLoginAttempts, setMaxLoginAttempts] = useState("5")

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
            <Shield className="w-7 h-7 text-primary" />
            Keamanan Sistem & Kebijakan Autentikasi
          </h1>
          <p className="text-muted-foreground text-sm">
            Konfigurasi batas waktu sesi login, autentikasi dua faktor (2FA), dan kebijakan kata sandi pengguna.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <Card className="border shadow-xs">
          <CardHeader className="border-b bg-muted/20">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Batas Waktu Sesi & Penguncian Otomatis
            </CardTitle>
            <CardDescription>
              Mengatur seberapa lama token sesi login tetap aktif sebelum meminta pengguna login ulang demi keamanan data.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="font-semibold">Batas Waktu Tidak Aktif / Idle Timeout (Menit)</Label>
                <Input 
                  type="number" 
                  value={sessionTimeout} 
                  onChange={e => setSessionTimeout(e.target.value)} 
                  min="15" 
                  max="1440" 
                />
                <p className="text-xs text-muted-foreground">Sesi akan otomatis berakhir jika tidak ada aktivitas selama periode ini.</p>
              </div>

              <div className="space-y-2">
                <Label className="font-semibold">Maksimal Percobaan Gagal Login</Label>
                <Input 
                  type="number" 
                  value={maxLoginAttempts} 
                  onChange={e => setMaxLoginAttempts(e.target.value)} 
                  min="3" 
                  max="10" 
                />
                <p className="text-xs text-muted-foreground">Akun akan dikunci sementara selama 15 menit setelah batas ini tercapai.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-xs">
          <CardHeader className="border-b bg-muted/20">
            <CardTitle className="text-base flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-primary" />
              Kebijakan Kata Sandi & Verifikasi 2FA
            </CardTitle>
            <CardDescription>
              Menjamin kekuatan kata sandi seluruh karyawan dan staf keuangan.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/20">
              <div className="space-y-0.5">
                <Label className="font-semibold text-foreground flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-primary" />
                  Wajibkan Autentikasi Dua Faktor (2FA / OTP)
                </Label>
                <p className="text-xs text-muted-foreground">
                  Mengharuskan kode OTP WhatsApp/Email untuk pengguna dengan hak akses Administrator & Finance Manager.
                </p>
              </div>
              <Switch checked={require2FA} onCheckedChange={setRequire2FA} />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/20">
              <div className="space-y-0.5">
                <Label className="font-semibold text-foreground flex items-center gap-2">
                  <Lock className="w-4 h-4 text-primary" />
                  Kompleksitas Kata Sandi (Huruf Besar, Angka & Simbol)
                </Label>
                <p className="text-xs text-muted-foreground">
                  Mencegah penggunaan kata sandi yang mudah ditebak oleh pengguna saat registrasi atau ganti sandi.
                </p>
              </div>
              <Switch checked={enforcePasswordComplexity} onCheckedChange={setEnforcePasswordComplexity} />
            </div>

            <div className="space-y-2 max-w-sm">
              <Label className="font-semibold">Panjang Minimal Kata Sandi</Label>
              <Input 
                type="number" 
                value={passwordMinLength} 
                onChange={e => setPasswordMinLength(e.target.value)} 
                min="8" 
                max="32" 
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 items-center">
          {saved && (
            <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Kebijakan keamanan berhasil diperbarui!
            </span>
          )}
          <Button type="submit" className="bg-primary text-primary-foreground gap-2">
            <Save className="w-4 h-4" /> Simpan Perubahan Kebijakan
          </Button>
        </div>
      </form>
    </div>
  )
}
