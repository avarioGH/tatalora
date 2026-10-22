"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { api } from "@/lib/api"
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  Lock, 
  Shield, 
  Building, 
  Warehouse, 
  Save, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  KeyRound
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function AccountSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [profileSaving, setProfileSaving] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)

  const [profileSuccess, setProfileSuccess] = useState("")
  const [profileError, setProfileError] = useState("")

  const [passwordSuccess, setPasswordSuccess] = useState("")
  const [passwordError, setPasswordError] = useState("")

  const [user, setUser] = useState<any>({
    username: "",
    name: "",
    email: "",
    phone: "",
    role: null,
    company: null,
    warehouse_accesses: [],
    accessible_modules: [],
  })

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const res = await api.get("/users/profile")
      if (res.data) {
        setUser(res.data)
      }
    } catch (err: any) {
      console.error(err)
      // Fallback to local storage if API call fails
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("erp_user")
        if (stored) {
          try {
            setUser((prev: any) => ({ ...prev, ...JSON.parse(stored) }))
          } catch (_) {}
        }
      }
    } finally {
      setLoading(false)
    }
  }

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileSaving(true)
    setProfileError("")
    setProfileSuccess("")

    try {
      const res = await api.put("/users/profile", {
        name: user.name,
        email: user.email,
        phone: user.phone,
      })

      setProfileSuccess(res.data?.message || "Profil berhasil diperbarui.")
      
      // Update local storage
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("erp_user")
        if (stored) {
          try {
            const parsed = JSON.parse(stored)
            parsed.name = user.name
            parsed.email = user.email
            localStorage.setItem("erp_user", JSON.stringify(parsed))
          } catch (_) {}
        }
      }

      setTimeout(() => setProfileSuccess(""), 4000)
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Gagal memperbarui profil."
      setProfileError(msg)
    } finally {
      setProfileSaving(false)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordSaving(true)
    setPasswordError("")
    setPasswordSuccess("")

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("Konfirmasi password baru tidak cocok.")
      setPasswordSaving(false)
      return
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordError("Password baru minimal 6 karakter.")
      setPasswordSaving(false)
      return
    }

    try {
      const res = await api.put("/users/change-password", {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      })

      setPasswordSuccess(res.data?.message || "Password berhasil diubah.")
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      })
      setTimeout(() => setPasswordSuccess(""), 4000)
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Gagal mengubah password."
      setPasswordError(msg)
    } finally {
      setPasswordSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="text-sm font-medium">Memuat profil akun...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto pb-16">
      
      {/* Top Breadcrumb */}
      <div className="flex items-center gap-4">
        <Link href="/settings">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Profil & Akun Pengguna
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Kelola informasi pribadi, identitas login, dan keamanan akun Anda
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Kolom Kiri: Ringkasan Akun */}
        <div className="md:col-span-1 space-y-6">
          <Card className="border-slate-200 shadow-2xs">
            <CardHeader className="text-center pb-2">
              <div className="w-20 h-20 rounded-full bg-blue-600 text-white font-extrabold text-2xl flex items-center justify-center mx-auto shadow-sm border-2 border-white">
                {user.name ? user.name.slice(0, 2).toUpperCase() : "US"}
              </div>
              <CardTitle className="mt-3 text-base font-bold text-slate-900">
                {user.name || "Administrator"}
              </CardTitle>
              <CardDescription className="text-xs">
                @{user.username || "admin"}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2 space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl space-y-2 border border-slate-100">
                <div className="flex items-center justify-between text-slate-600">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Shield className="w-3.5 h-3.5 text-blue-600" /> Role
                  </span>
                  <span className="font-bold text-slate-900 bg-blue-100/70 text-blue-700 px-2 py-0.5 rounded-md">
                    {user.role?.name || "Owner"}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-600">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Building className="w-3.5 h-3.5 text-indigo-600" /> Perusahaan
                  </span>
                  <span className="font-semibold text-slate-900 truncate max-w-[130px]">
                    {user.company?.name || "TATALORA ERP"}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-600">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Warehouse className="w-3.5 h-3.5 text-amber-600" /> Akses Gudang
                  </span>
                  <span className="font-semibold text-slate-900">
                    {user.warehouse_accesses?.length ? `${user.warehouse_accesses.length} Gudang` : "Semua (Pusat)"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Kolom Kanan: Form Edit Profil & Ganti Password */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Card 1: Informasi Profil */}
          <Card className="border-slate-200 shadow-2xs">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" />
                <span>Informasi Profil</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Perbarui nama lengkap, alamat email, dan kontak Anda
              </CardDescription>
            </CardHeader>
            <CardContent>
              {profileSuccess && (
                <div className="mb-4 p-3 rounded-xl text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{profileSuccess}</span>
                </div>
              )}

              {profileError && (
                <div className="mb-4 p-3 rounded-xl text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{profileError}</span>
                </div>
              )}

              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-bold text-slate-700 mb-1 block">Username</Label>
                    <Input 
                      value={user.username || ""} 
                      disabled 
                      className="bg-slate-50 text-slate-500 font-medium cursor-not-allowed text-xs" 
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">Username tidak dapat diubah</span>
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-slate-700 mb-1 block">Nama Lengkap</Label>
                    <Input 
                      value={user.name || ""} 
                      required
                      onChange={(e) => setUser({ ...user, name: e.target.value })}
                      placeholder="Nama Lengkap Anda" 
                      className="text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-bold text-slate-700 mb-1 block">Alamat Email</Label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400 pointer-events-none" />
                      <Input 
                        type="email"
                        value={user.email || ""} 
                        required
                        onChange={(e) => setUser({ ...user, email: e.target.value })}
                        placeholder="your email" 
                        className="pl-9 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-slate-700 mb-1 block">Nomor Telepon / WhatsApp</Label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400 pointer-events-none" />
                      <Input 
                        value={user.phone || ""} 
                        onChange={(e) => setUser({ ...user, phone: e.target.value })}
                        placeholder="08xxxxxxxxxx" 
                        className="pl-9 text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={profileSaving}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs gap-1.5 shadow-xs"
                  >
                    {profileSaving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>Simpan Profil</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Card 2: Ubah Kata Sandi */}
          <Card className="border-slate-200 shadow-2xs">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-emerald-600" />
                <span>Ubah Kata Sandi</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Perbarui kata sandi akun Anda secara berkala demi keamanan
              </CardDescription>
            </CardHeader>
            <CardContent>
              {passwordSuccess && (
                <div className="mb-4 p-3 rounded-xl text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{passwordSuccess}</span>
                </div>
              )}

              {passwordError && (
                <div className="mb-4 p-3 rounded-xl text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <Label className="text-xs font-bold text-slate-700 mb-1 block">Password Saat Ini</Label>
                  <Input 
                    type="password"
                    required
                    placeholder="Masukkan password saat ini" 
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    className="text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-bold text-slate-700 mb-1 block">Password Baru</Label>
                    <Input 
                      type="password"
                      required
                      placeholder="Minimal 6 karakter" 
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      className="text-xs"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-slate-700 mb-1 block">Ulangi Password Baru</Label>
                    <Input 
                      type="password"
                      required
                      placeholder="Konfirmasi password baru" 
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      className="text-xs"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={passwordSaving}
                    variant="outline"
                    className="border-slate-300 font-bold text-xs gap-1.5 hover:bg-slate-50"
                  >
                    {passwordSaving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Mengubah...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5" />
                        <span>Update Password</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

        </div>

      </div>

    </div>
  )
}
