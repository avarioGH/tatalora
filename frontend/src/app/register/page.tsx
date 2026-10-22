"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Loader2, Lock, User, Building, Phone, Mail } from "lucide-react"

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company_name: "",
    password: ""
  })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Redirect ke WhatsApp atau form konsultasi untuk pembuatan workspace instan
    setTimeout(() => {
      const waText = [
        "Halo Tim TATALORA, saya ingin membuat akun bisnis & workspace baru:",
        "",
        `• Nama: ${formData.name}`,
        `• Perusahaan: ${formData.company_name}`,
        `• Email: ${formData.email}`,
        `• WhatsApp: ${formData.phone}`,
        "",
        "Mohon dibantu pembuatan akun dan akses sistemnya. Terima kasih!"
      ].join("\n")

      const waUrl = "https://wa.me/6287785876197?text=" + encodeURIComponent(waText)
      window.open(waUrl, "_blank")
      setLoading(false)
      setSubmitted(true)
    }, 600)
  }

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
            Daftarkan Bisnis Anda dalam Hitungan Menit.
          </h1>
          
          <p className="text-base text-slate-600 leading-relaxed mb-8">
            Dapatkan akses penuh ke sistem ERP terintegrasi. Konsultan kami siap mendampingi proses setup awal perusahaan Anda tanpa biaya tambahan.
          </p>

          <div className="space-y-3 text-xs font-semibold text-slate-700">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold">✓</span>
              <span>14 Hari Akses Uji Coba Penuh</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold">✓</span>
              <span>Template Impor Master Data Excel</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold">✓</span>
              <span>Pendampingan Onboarding WhatsApp 24/7</span>
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
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Buat Akun Bisnis 🚀
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1.5">
              Mulai kelola operasional perusahaan Anda secara modern
            </p>
          </div>

          {submitted ? (
            <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-200 text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-lg font-bold">✓</div>
              <h3 className="text-base font-bold text-emerald-900">Permintaan Registrasi Terkirim!</h3>
              <p className="text-xs text-emerald-700 leading-relaxed">
                WhatsApp Anda telah terbuka untuk menghubungkan detail bisnis ke tim implementasi TATALORA.
              </p>
              <Link href="/login" className="inline-block mt-2 text-xs font-bold text-blue-600 hover:underline">
                Kembali ke Halaman Login →
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3.5">
              
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Lengkap *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Budi Santoso"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 shadow-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Perusahaan / Bisnis *
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
                    onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 shadow-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Email Bisnis *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      required
                      placeholder="budi@perusahaan.com"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 shadow-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nomor WhatsApp *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      type="tel"
                      required
                      placeholder="08xxxxxxxxxx"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 shadow-xs"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Buat Password Akun *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    placeholder="Minimal 6 karakter"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 shadow-xs"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xs hover:shadow transition-all disabled:opacity-60 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Menyiapkan Workspace...</span>
                    </>
                  ) : (
                    <span>Daftar & Hubungkan ke Konsultan</span>
                  )}
                </button>
              </div>

            </form>
          )}

          <div className="mt-8 text-center">
            <p className="text-xs text-slate-600">
              Sudah memiliki akun?{" "}
              <Link 
                href="/login" 
                className="font-bold text-blue-600 hover:text-blue-700 hover:underline"
              >
                Sign In di sini
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
