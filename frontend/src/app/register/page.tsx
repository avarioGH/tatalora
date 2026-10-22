"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { api } from "@/lib/api"
import { ArrowLeft, Loader2, Lock, User, Building, Mail, Eye, EyeOff } from "lucide-react"

export default function RegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company_name: "",
    password: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (formData.password.length < 6) {
      setError("Kata sandi minimal 6 karakter.")
      return
    }

    setLoading(true)

    try {
      const res = await api.post("/auth/register", formData)
      const data = res.data

      if (data.access_token) {
        localStorage.setItem("erp_token", data.access_token)
        localStorage.setItem("erp_user", JSON.stringify(data.user))
        window.location.href = "/"
      } else {
        router.push("/login")
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        err.message ||
        "Gagal membuat akun."
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleRegister = () => {
    setGoogleLoading(true)
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL || "https://api.tatalora.com"}/auth/google`
  }

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-[#F8FAFC]">
      {/* Sisi Kiri - Branding */}
      <div className="hidden md:flex md:w-[46%] lg:w-[48%] bg-white flex-col justify-between p-12 lg:p-16 border-r border-slate-200/80 relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-50/70 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-50/70 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <Link href="https://tatalora.com" className="inline-flex items-center gap-3 group">
            <img 
              src="/logo.png" 
              alt="TATALORA Logo" 
              className="w-10 h-10 rounded-xl object-contain shadow-xs" 
            />
            <span className="text-2xl font-extrabold tracking-tight text-slate-900">
              TATALORA
            </span>
          </Link>
        </div>

        <div className="max-w-md my-auto relative z-10">
          <h1 className="text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight leading-[1.2] mb-5">
            Mulai Transformasi Digital Bisnis Anda Hari Ini.
          </h1>
          <p className="text-base text-slate-600 leading-relaxed mb-8">
            Daftarkan bisnis Anda dan dapatkan workspace ERP lengkap untuk penjualan, multi-gudang, pembelian, dan keuangan otomatis.
          </p>

          <div className="grid grid-cols-2 gap-y-3 gap-x-4 pt-6 border-t border-slate-100 text-xs text-slate-600 font-medium">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
              <span>Workspace Instan</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
              <span>Full ERP Access</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
              <span>Multi-Company Ready</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
              <span>Keamanan Standar Cloud</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-xs text-slate-400">
          © 2026 TATALORA by Avario. Seluruh hak cipta dilindungi.
        </div>
      </div>

      {/* Sisi Kanan - Form Register */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-12 lg:p-16">
        <div className="flex items-center justify-between">
          <Link 
            href="/login" 
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Sudah punya akun? Masuk</span>
          </Link>

          <div className="md:hidden flex items-center gap-2">
            <img src="/logo.png" alt="TATALORA" className="w-7 h-7 rounded-lg object-contain" />
            <span className="font-extrabold text-slate-900 text-base">TATALORA</span>
          </div>
        </div>

        <div className="w-full max-w-sm sm:max-w-md mx-auto my-auto py-6">
          <div className="mb-6">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Daftar Akun Baru</span>
              <span className="text-2xl">✨</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1.5">
              Buat akun bisnis Anda dan mulai gunakan TATALORA
            </p>
          </div>

          {/* Tombol Daftar / Masuk dengan Google */}
          <div className="mb-6">
            <button
              type="button"
              onClick={handleGoogleRegister}
              disabled={googleLoading}
              className="w-full py-3 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm flex items-center justify-center gap-3 shadow-xs hover:border-slate-300 transition-all cursor-pointer"
            >
              {googleLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
              )}
              <span>Daftar / Masuk dengan Google</span>
            </button>
          </div>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-wider">
              <span className="bg-[#F8FAFC] px-3 font-bold text-slate-400">
                ATAU DAFTAR MANUAL
              </span>
            </div>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200 flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1 flex-shrink-0" />
              <div className="flex-1">
                <span>{error}</span>
                {error.toLowerCase().includes("sudah terdaftar") && (
                  <div className="mt-1 font-bold">
                    <Link href="/login" className="text-blue-600 hover:underline">
                      Klik di sini untuk langsung masuk →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Nama Lengkap
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="Nama Anda"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all shadow-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Nama Perusahaan / Bisnis
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Building className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="PT / CV / Toko Anda"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all shadow-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  placeholder="your email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all shadow-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Kata Sandi
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Minimal 6 karakter"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all shadow-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xs hover:shadow transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Mendaftarkan akun...</span>
                  </>
                ) : (
                  <span>Buat Akun Bisnis</span>
                )}
              </button>
            </div>
          </form>

          <div className="mt-8 text-center">
            <p className="text-xs text-slate-600">
              Sudah memiliki akun?{" "}
              <Link 
                href="/login" 
                className="font-bold text-blue-600 hover:text-blue-700 hover:underline"
              >
                Masuk di sini
              </Link>
            </p>
          </div>
        </div>

        <div className="md:hidden text-center text-[11px] text-slate-400">
          © 2026 TATALORA by Avario.
        </div>
      </div>
    </div>
  )
}
