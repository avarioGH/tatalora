"use client"

import { useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { api } from "@/lib/api"
import { ArrowLeft, Loader2, Lock, Eye, EyeOff, CheckCircle2 } from "lucide-react"

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get("token") || ""

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!token) {
      setError("Token reset tidak ditemukan atau link sudah kedaluwarsa.")
      return
    }

    if (password !== confirmPassword) {
      setError("Konfirmasi kata sandi baru tidak cocok.")
      return
    }

    if (password.length < 6) {
      setError("Kata sandi baru minimal 6 karakter.")
      return
    }

    setLoading(true)

    try {
      await api.post("/auth/reset-password", { token, password })
      setSuccess(true)
      setTimeout(() => {
        router.push("/login")
      }, 2500)
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Gagal mengatur ulang kata sandi."
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm sm:max-w-md mx-auto my-auto py-6">
      {success ? (
        <div className="text-center space-y-4 animate-in fade-in zoom-in-95 duration-300">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto border border-emerald-100">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Kata Sandi Berhasil Diperbarui! 🎉
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Kata sandi akun TATALORA Anda telah berhasil diubah. Mengalihkan Anda ke halaman login...
          </p>
          <div className="pt-4">
            <Link
              href="/login"
              className="inline-flex items-center justify-center w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-xs transition-all"
            >
              Masuk Sekarang
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Buat Kata Sandi Baru 🔑
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1.5">
              Masukkan kata sandi baru yang kuat untuk akun Anda.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200 flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Kata Sandi Baru
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Minimal 6 karakter"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all shadow-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Konfirmasi Kata Sandi Baru
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Ulangi kata sandi baru"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all shadow-xs"
                />
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
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <span>Simpan Kata Sandi Baru</span>
                )}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-[#F8FAFC]">
      {/* Sisi Kiri - Branding TATALORA */}
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
            Keamanan Akun Anda adalah Prioritas Kami.
          </h1>
          <p className="text-base text-slate-600 leading-relaxed">
            Pastikan membuat kata sandi yang unik, sulit ditebak, dan tidak digunakan di aplikasi lain demi menjaga keamanan data bisnis Anda.
          </p>
        </div>

        <div className="relative z-10 text-xs text-slate-400">
          © 2026 TATALORA by Avario. Seluruh hak cipta dilindungi.
        </div>
      </div>

      {/* Sisi Kanan - Form */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-12 lg:p-16">
        <div className="flex items-center justify-between">
          <Link 
            href="/login" 
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Halaman Masuk</span>
          </Link>

          <div className="md:hidden flex items-center gap-2">
            <img src="/logo.png" alt="TATALORA" className="w-7 h-7 rounded-lg object-contain" />
            <span className="font-extrabold text-slate-900 text-base">TATALORA</span>
          </div>
        </div>

        <Suspense fallback={
          <div className="w-full flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        }>
          <ResetPasswordForm />
        </Suspense>

        <div className="md:hidden text-center text-[11px] text-slate-400">
          © 2026 TATALORA by Avario.
        </div>
      </div>
    </div>
  )
}
