"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { api } from "@/lib/api"
import { ArrowLeft, Loader2, Lock, User, Eye, EyeOff } from "lucide-react"

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const res = await api.post("/auth/login", { username, password })
      const data = res.data

      if (res.status !== 200 && res.status !== 201) {
        throw new Error(data.message || "Login gagal, silakan periksa kredensial Anda.")
      }

      localStorage.setItem("erp_token", data.access_token)
      localStorage.setItem("erp_user", JSON.stringify(data.user))

      window.location.href = "/"
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Gagal masuk ke sistem."
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-[#F8FAFC]">
      
      {/* Sisi Kiri - Branding TATALORA */}
      <div className="hidden md:flex md:w-1/2 bg-white flex-col justify-between p-12 lg:p-16 border-r border-slate-200/80 relative overflow-hidden">
        {/* Subtle background decoration */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-50/60 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-50/60 rounded-full blur-3xl pointer-events-none" />

        {/* Top Logo */}
        <div className="relative z-10">
          <Link href="https://tatalora.com" class="inline-flex items-center gap-3 group">
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

        {/* Center Copy */}
        <div className="max-w-lg my-auto relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold mb-6">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            Platform ERP Terintegrasi
          </div>
          
          <h1 className="text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight leading-[1.2] mb-5">
            Tumbuhkan Bisnis Anda Lebih Cepat & Terstruktur.
          </h1>
          
          <p className="text-base text-slate-600 leading-relaxed">
            Kelola operasional, penjualan, inventori multi-gudang, pembelian, dan laporan keuangan dalam satu sistem cerdas yang terhubung untuk seluruh tim Anda.
          </p>

          <div className="grid grid-cols-2 gap-4 mt-8 pt-8 border-t border-slate-100 text-xs text-slate-600 font-medium">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
              <span>Real-time Financials</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
              <span>Multi-Warehouse Stock</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
              <span>Automated Invoicing</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
              <span>Sawmill & Production</span>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 text-xs text-slate-400">
          © 2026 TATALORA by Avario. Seluruh hak cipta dilindungi.
        </div>
      </div>

      {/* Sisi Kanan - Form Login */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-12 lg:p-16">
        
        {/* Top Link Kembali */}
        <div className="flex items-center justify-between">
          <Link 
            href="https://tatalora.com" 
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Beranda</span>
          </Link>

          <div className="md:hidden flex items-center gap-2">
            <img src="/logo.png" alt="TATALORA" className="w-7 h-7 rounded-lg object-contain" />
            <span className="font-extrabold text-slate-900 text-base">TATALORA</span>
          </div>
        </div>

        {/* Form Container */}
        <div className="w-full max-w-md mx-auto my-auto py-8">
          
          <div className="mb-8">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Selamat Datang</span>
              <span className="text-2xl">👋</span>
            </h2>
            <p className="text-sm text-slate-500 mt-2">
              Masuk ke akun TATALORA Anda untuk melanjutkan ke sistem kerja bisnis.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200 flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            
            {/* Input Username / Email */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Username atau Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  id="username"
                  required
                  placeholder="e.g. kayu / admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all shadow-xs"
                />
              </div>
            </div>

            {/* Input Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Password
                </label>
                <a 
                  href="https://wa.me/6287785876197?text=Halo%20Admin%20TATALORA,%20saya%20butuh%20bantuan%20reset%20password%20akun%20saya" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                >
                  Lupa password?
                </a>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  required
                  placeholder="Masukkan password akun Anda"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all shadow-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm hover:shadow transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Memverifikasi akun...</span>
                  </>
                ) : (
                  <span>Sign In</span>
                )}
              </button>
            </div>
          </form>

          {/* Terms & Register Link */}
          <div className="mt-8 text-center space-y-3">
            <p className="text-[11px] text-slate-500">
              Dengan masuk, Anda menyetujui{" "}
              <a href="#" className="font-semibold text-slate-700 hover:underline">
                Ketentuan Layanan
              </a>{" "}
              dan{" "}
              <a href="#" className="font-semibold text-slate-700 hover:underline">
                Kebijakan Privasi
              </a>.
            </p>

            <p className="text-xs text-slate-600">
              Belum memiliki akun bisnis?{" "}
              <a 
                href="https://tatalora.com#harga" 
                className="font-bold text-blue-600 hover:text-blue-700 hover:underline"
              >
                Daftar & Mulai Konsultasi
              </a>
            </p>
          </div>

        </div>

        {/* Mobile footer */}
        <div className="md:hidden text-center text-[11px] text-slate-400">
          © 2026 TATALORA by Avario.
        </div>

      </div>

    </div>
  )
}
