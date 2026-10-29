"use client"

import { useState, useEffect } from "react"
import { 
  Building2, 
  Users, 
  ShieldCheck, 
  Warehouse, 
  MessageSquare, 
  Mail, 
  Database, 
  Bot, 
  FileText, 
  Sliders, 
  Bell, 
  Key, 
  Printer, 
  Activity, 
  Lock, 
  User, 
  ChevronRight,
  Sparkles
} from "lucide-react"
import Link from "next/link"

const SETTINGS_SECTIONS = [
  {
    category: "Akun & Keamanan",
    description: "Kelola profil pribadi, kata sandi, dan proteksi login",
    items: [
      {
        title: "Profil Saya & Akun",
        description: "Ubah nama, email, nomor HP, foto profil, dan kata sandi",
        icon: User,
        href: "/settings/account",
        badge: "Penting",
        color: "text-blue-600 bg-blue-50 border-blue-100",
      },
      {
        title: "Keamanan Sistem",
        description: "Pengaturan autentikasi, sesi aktif, dan kebijakan password",
        icon: ShieldCheck,
        href: "/settings/security",
        color: "text-emerald-600 bg-emerald-50 border-emerald-100",
      },
      {
        title: "Audit Logs",
        description: "Pantau riwayat aktivitas dan jejak perubahan sistem",
        icon: Activity,
        href: "/settings/audit-logs",
        color: "text-slate-600 bg-slate-100 border-slate-200",
      },
    ],
  },
  {
    category: "Perusahaan & Organisasi",
    description: "Pengaturan identitas bisnis, cabang, dan manajemen tim",
    items: [
      {
        title: "Profil Perusahaan",
        description: "Nama perusahaan, mata uang, zona waktu, dan format invoice",
        icon: Building2,
        href: "/settings/company",
        color: "text-indigo-600 bg-indigo-50 border-indigo-100",
      },
      {
        title: "Pengguna & Hak Akses",
        description: "Kelola tim kerja, admin, staf, dan batasan akses modul",
        icon: Users,
        href: "/settings/users",
        color: "text-violet-600 bg-violet-50 border-violet-100",
      },
      {
        title: "Kunci Periode & Tutup Buku",
        description: "Kunci transaksi periode lalu dan proses tutup buku keuangan berkala",
        icon: Lock,
        href: "/finance/accounting-periods",
        badge: "Jurnal",
        color: "text-rose-600 bg-rose-50 border-rose-100",
      },
      {
        title: "Lokasi & Gudang",
        description: "Konfigurasi multi-gudang dan titik penyimpanan stok",
        icon: Warehouse,
        href: "/settings/warehouse",
        color: "text-amber-600 bg-amber-50 border-amber-100",
      },
      {
        title: "Format Penomoran",
        description: "Atur prefix dan urutan nomor faktur, pesanan, dan surat jalan",
        icon: FileText,
        href: "/settings/numbering",
        color: "text-sky-600 bg-sky-50 border-sky-100",
      },
    ],
  },
  {
    category: "Komunikasi & Notifikasi",
    description: "Integrasi pesan WhatsApp, email blast, dan notifikasi",
    items: [
      {
        title: "WhatsApp & Notifikasi",
        description: "Hubungkan WhatsApp Gateway untuk invoice reminder otomatis",
        icon: MessageSquare,
        href: "/settings/communication",
        color: "text-emerald-600 bg-emerald-50 border-emerald-100",
      },
      {
        title: "Konfigurasi Email / SMTP",
        description: "Pengaturan pengirim email transaksi dan laporan",
        icon: Mail,
        href: "/settings/email",
        color: "text-rose-600 bg-rose-50 border-rose-100",
      },
      {
        title: "Pemberitahuan Sistem",
        description: "Atur trigger notifikasi stok menipis dan piutang jatuh tempo",
        icon: Bell,
        href: "/settings/notification",
        color: "text-orange-600 bg-orange-50 border-orange-100",
      },
    ],
  },
  {
    category: "Sistem & Integrasi",
    description: "Kecerdasan buatan, database, backup, dan hardware",
    items: [
      {
        title: "TATALORA AI Assistant",
        description: "Konfigurasi kecerdasan buatan untuk analisis bisnis otomatis",
        icon: Bot,
        href: "/settings/ai",
        badge: "AI Powered",
        color: "text-purple-600 bg-purple-50 border-purple-100",
      },
      {
        title: "Integrasi & API Keys",
        description: "Kelola API token dan webhook pihak ketiga",
        icon: Key,
        href: "/settings/integrations",
        color: "text-blue-600 bg-blue-50 border-blue-100",
      },
      {
        title: "Database & Cadangan (Backup)",
        description: "Pencadangan data berkala dan pemulihan sistem",
        icon: Database,
        href: "/settings/database",
        color: "text-teal-600 bg-teal-50 border-teal-100",
      },
      {
        title: "Printer & Barcode",
        description: "Format cetak struk kasir, label barcode, dan thermal printer",
        icon: Printer,
        href: "/settings/printer",
        color: "text-zinc-600 bg-zinc-100 border-zinc-200",
      },
    ],
  },
]

export default function SettingsHubPage() {
  const [userName, setUserName] = useState("Administrator")

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("erp_user")
      if (stored) {
        try {
          const u = JSON.parse(stored)
          if (u.name) setUserName(u.name)
        } catch (_) {}
      }
    }
  }, [])

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto pb-16">
      
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 p-8 text-white shadow-sm border border-slate-800">
        <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-blue-600/20 blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold mb-3 border border-blue-400/30">
            <Sliders className="w-3.5 h-3.5" />
            <span>Pusat Kendali Sistem</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Pengaturan TATALORA
          </h1>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            Kelola profil akun Anda, preferensi perusahaan, pengguna, izin modul, serta konfigurasi integrasi sistem ERP dalam satu tempat.
          </p>
        </div>
      </div>

      {/* Grid Kategori Pengaturan */}
      <div className="space-y-8">
        {SETTINGS_SECTIONS.map((section, idx) => (
          <div key={idx} className="space-y-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                {section.category}
              </h2>
              <p className="text-xs text-slate-500">
                {section.description}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {section.items.map((item, itemIdx) => {
                const Icon = item.icon
                return (
                  <Link
                    key={itemIdx}
                    href={item.href}
                    className="group relative flex flex-col justify-between p-5 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50/80 hover:border-blue-400/70 hover:shadow-sm transition-all duration-200 cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3.5">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-2xs ${item.color}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        {item.badge && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100 flex items-center gap-1">
                            {item.badge === "AI Powered" && <Sparkles className="w-2.5 h-2.5" />}
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">
                        {item.description}
                      </p>
                    </div>

                    <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-400 group-hover:text-blue-600 transition-colors">
                      <span>Buka Pengaturan</span>
                      <ChevronRight className="w-4 h-4 transform group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </div>

    </div>
  )
}
