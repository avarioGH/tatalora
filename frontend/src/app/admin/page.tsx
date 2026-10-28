"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { 
  Users, HardDrive, CreditCard, Calendar, Phone, Mail, 
  Search, ShieldAlert, CheckCircle2, Clock, AlertCircle, 
  ExternalLink, Plus, Trash2, CheckSquare, Square, 
  Building2, MessageSquare, ArrowRight, UserCheck, Shield,
  Save, RefreshCw
} from "lucide-react"
import { ConsultationAPI } from "@/lib/api"

type UserTenant = {
  id: string
  name: string
  email: string
  phone: string
  company: string
  plan: "Starter" | "Pro" | "Enterprise" | "Custom"
  storageUsedMB: number
  storageLimitMB: number
  monthlyFee: number
  expiredDate: string
  status: "Active" | "Expiring Soon" | "Suspended"
}

type TodoItem = {
  id: string
  task: string
  priority: "High" | "Medium" | "Low"
  dueDate: string
  completed: boolean
}

export default function AdminPortalPage() {
  const [activeTab, setActiveTab] = useState<"users" | "consultations" | "workspace" | "crm">("users")

  // --- TAB 1: User & Subscription State ---
  const [users, setUsers] = useState<UserTenant[]>([
    {
      id: "usr-01",
      name: "Billion Danvers",
      email: "danvers@tatalora.com",
      phone: "0812-3456-7890",
      company: "PT Tatalora Digital Perkasa",
      plan: "Enterprise",
      storageUsedMB: 2450,
      storageLimitMB: 10240,
      monthlyFee: 1500000,
      expiredDate: "2027-12-31",
      status: "Active"
    },
    {
      id: "usr-02",
      name: "Rian Hidayat",
      email: "rian@retailnusantara.id",
      phone: "0857-1122-3344",
      company: "CV Retail Nusantara",
      plan: "Pro",
      storageUsedMB: 1820,
      storageLimitMB: 5120,
      monthlyFee: 500000,
      expiredDate: "2026-11-15",
      status: "Active"
    },
    {
      id: "usr-03",
      name: "Siti Rahma",
      email: "rahma@kulinerberkah.com",
      phone: "0819-8765-4321",
      company: "Berkah Kuliner Group",
      plan: "Starter",
      storageUsedMB: 890,
      storageLimitMB: 2048,
      monthlyFee: 250000,
      expiredDate: "2026-10-30",
      status: "Expiring Soon"
    },
    {
      id: "usr-04",
      name: "Hendro Wijaya",
      email: "hendro@logistikexpress.co.id",
      phone: "0821-9988-7766",
      company: "PT Logistik Sentra Express",
      plan: "Pro",
      storageUsedMB: 4900,
      storageLimitMB: 5120,
      monthlyFee: 500000,
      expiredDate: "2026-12-01",
      status: "Active"
    }
  ])

  const [searchUser, setSearchUser] = useState("")
  const [editingUser, setEditingUser] = useState<UserTenant | null>(null)

  // Save changes to user
  const handleSaveUser = () => {
    if (!editingUser) return
    setUsers(users.map(u => u.id === editingUser.id ? editingUser : u))
    setEditingUser(null)
  }

  // --- TAB 2: Consultations / Leads State ---
  const [consultations, setConsultations] = useState<any[]>([])
  const [loadingLeads, setLoadingLeads] = useState(false)
  const [statusFilter, setStatusFilter] = useState("ALL")

  const loadConsultations = async () => {
    setLoadingLeads(true)
    try {
      const data = await ConsultationAPI.getAll()
      if (Array.isArray(data)) {
        setConsultations(data)
      } else if (data?.data && Array.isArray(data.data)) {
        setConsultations(data.data)
      } else {
        fallbackLeads()
      }
    } catch (err) {
      fallbackLeads()
    } finally {
      setLoadingLeads(false)
    }
  }

  const fallbackLeads = () => {
    setConsultations([
      {
        id: "lead-01",
        name: "Arif Kurniawan",
        phone: "6281234567891",
        company_name: "PT Mega Distribusi Utama",
        position: "Direktur Operasional",
        industry: "Distribusi & Grosir",
        budget: "Rp 5.000.000 - Rp 10.000.000",
        notes: "Membutuhkan sistem manajemen multi-cabang & sinkronisasi stok realtime antar gudang.",
        status: "NEW",
        created_at: new Date().toISOString()
      },
      {
        id: "lead-02",
        name: "Dewi Lestari",
        phone: "6285678901234",
        company_name: "Sentosa Retail Fashion",
        position: "Store Owner",
        industry: "Retail & Fashion",
        budget: "Rp 2.000.000 - Rp 5.000.000",
        notes: "Ingin migrasi dari sistem manual ke POS Cloud + Laporan Laba Rugi otomatis.",
        status: "CONTACTED",
        created_at: new Date(Date.now() - 86400000).toISOString()
      }
    ])
  }

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await ConsultationAPI.updateStatus(id, newStatus)
    } catch (e) {
      // Local state update fallback
    }
    setConsultations(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c))
  }

  useEffect(() => {
    loadConsultations()
  }, [])

  // --- TAB 3: Workspace & Todo List State ---
  const [todos, setTodos] = useState<TodoItem[]>([
    { id: "td-1", task: "Follow up lead enterprise PT Mega Distribusi Utama", priority: "High", dueDate: "2026-10-28", completed: false },
    { id: "td-2", task: "Review limit storage tenant Berkah Kuliner Group", priority: "Medium", dueDate: "2026-10-29", completed: true },
    { id: "td-3", task: "Backup mingguan database PostgreSQL & storage S3", priority: "High", dueDate: "2026-10-31", completed: false },
    { id: "td-4", task: "Rilis update formulir penawaran harga & modul CRM", priority: "Medium", dueDate: "2026-11-02", completed: false }
  ])
  const [newTodoTask, setNewTodoTask] = useState("")
  const [newTodoPriority, setNewTodoPriority] = useState<"High" | "Medium" | "Low">("Medium")
  const [newTodoDueDate, setNewTodoDueDate] = useState("")

  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTodoTask.trim()) return
    const newT: TodoItem = {
      id: `td-${Date.now()}`,
      task: newTodoTask.trim(),
      priority: newTodoPriority,
      dueDate: newTodoDueDate || new Date().toISOString().split("T")[0],
      completed: false
    }
    setTodos([newT, ...todos])
    setNewTodoTask("")
  }

  const toggleTodo = (id: string) => {
    setTodos(todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t))
  }

  const deleteTodo = (id: string) => {
    setTodos(todos.filter(t => t.id !== id))
  }

  // Filtered lists
  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchUser.toLowerCase()) ||
    u.company.toLowerCase().includes(searchUser.toLowerCase()) ||
    u.email.toLowerCase().includes(searchUser.toLowerCase())
  )

  const filteredConsultations = consultations.filter(c => {
    if (statusFilter === "ALL") return true
    return c.status === statusFilter
  })

  // Format IDR
  const formatIDR = (val: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val)
  }

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-100">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Admin Master Portal</h1>
            <p className="text-sm text-slate-500">Kelola pengguna SaaS, batas storage, formulir leads tatalora.com, & workspace tim.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link 
            href="/crm"
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-2"
          >
            Buka CRM <ExternalLink className="w-4 h-4 text-slate-500" />
          </Link>
          <Link 
            href="/crm/partners"
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors flex items-center gap-2"
          >
            Database Pelanggan <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Quick Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Total Tenant Aktif</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{users.length} Akun</p>
            <span className="text-xs text-emerald-600 font-medium flex items-center gap-1 mt-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> 100% Operasional
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Storage Terpakai</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              {(users.reduce((acc, u) => acc + u.storageUsedMB, 0) / 1024).toFixed(1)} GB
            </p>
            <span className="text-xs text-slate-500 mt-1 block">
              dari {(users.reduce((acc, u) => acc + u.storageLimitMB, 0) / 1024).toFixed(0)} GB kuota total
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <HardDrive className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Leads Masuk (Web)</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{consultations.length} Leads</p>
            <span className="text-xs text-amber-600 font-medium flex items-center gap-1 mt-1">
              <Clock className="w-3.5 h-3.5" /> {consultations.filter(c => c.status === "NEW").length} Perlu Follow-up
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <MessageSquare className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">MRR SaaS</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">
              {formatIDR(users.reduce((acc, u) => acc + u.monthlyFee, 0))}
            </p>
            <span className="text-xs text-slate-500 mt-1 block">Recurring billing bulanan</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex border-b border-slate-200 bg-white px-6 rounded-t-2xl">
        <button
          onClick={() => setActiveTab("users")}
          className={`py-4 px-4 font-semibold text-sm border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "users"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Users className="w-4 h-4" /> Kelola Pengguna & Paket Langganan
        </button>
        <button
          onClick={() => setActiveTab("consultations")}
          className={`py-4 px-4 font-semibold text-sm border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "consultations"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <MessageSquare className="w-4 h-4" /> Formulir Kontak & Leads Web
          {consultations.filter(c => c.status === "NEW").length > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
              {consultations.filter(c => c.status === "NEW").length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("workspace")}
          className={`py-4 px-4 font-semibold text-sm border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "workspace"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <CheckSquare className="w-4 h-4" /> Workspace Admin & Todo List
        </button>
        <button
          onClick={() => setActiveTab("crm")}
          className={`py-4 px-4 font-semibold text-sm border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "crm"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Building2 className="w-4 h-4" /> Navigasi CRM & Customer
        </button>
      </div>

      {/* TAB 1: USERS & SUBSCRIPTION */}
      {activeTab === "users" && (
        <div className="bg-white p-6 rounded-b-2xl border border-slate-200 border-t-0 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Daftar Pengguna & Langganan SaaS</h2>
              <p className="text-sm text-slate-500">Monitor kapasitas disk, expired date, paket berlangganan, dan data kontak klien.</p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Cari user, email, atau PT..."
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="p-4">Pengguna / Perusahaan</th>
                  <th className="p-4">Paket Plan</th>
                  <th className="p-4">Pemakaian Storage</th>
                  <th className="p-4">Biaya Bulanan</th>
                  <th className="p-4">Masa Aktif / Expired</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredUsers.map((u) => {
                  const storagePercent = Math.min(100, Math.round((u.storageUsedMB / u.storageLimitMB) * 100))
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4">
                        <div className="font-semibold text-slate-900">{u.name}</div>
                        <div className="text-xs text-indigo-600 font-medium">{u.company}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-3 mt-1">
                          <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {u.email}</span>
                          <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {u.phone}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold ${
                          u.plan === "Enterprise" ? "bg-purple-100 text-purple-700" :
                          u.plan === "Pro" ? "bg-blue-100 text-blue-700" :
                          "bg-slate-100 text-slate-700"
                        }`}>
                          {u.plan}
                        </span>
                      </td>
                      <td className="p-4 min-w-[180px]">
                        <div className="flex justify-between text-xs text-slate-600 mb-1">
                          <span>{(u.storageUsedMB / 1024).toFixed(1)} GB</span>
                          <span className="text-slate-400">/ {(u.storageLimitMB / 1024).toFixed(0)} GB ({storagePercent}%)</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              storagePercent > 85 ? "bg-red-500" :
                              storagePercent > 60 ? "bg-amber-500" : "bg-indigo-600"
                            }`}
                            style={{ width: `${storagePercent}%` }}
                          />
                        </div>
                      </td>
                      <td className="p-4 font-semibold text-slate-800">
                        {formatIDR(u.monthlyFee)}
                        <span className="text-xs font-normal text-slate-400 block">/ bulan</span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 font-medium text-slate-700">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          {u.expiredDate}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          u.status === "Active" ? "bg-emerald-100 text-emerald-700" :
                          u.status === "Expiring Soon" ? "bg-amber-100 text-amber-700" :
                          "bg-red-100 text-red-700"
                        }`}>
                          {u.status}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => setEditingUser(u)}
                          className="px-3 py-1.5 text-xs font-medium bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
                        >
                          Atur Plan & Kuota
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Edit User Modal */}
          {editingUser && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
                <div className="flex justify-between items-center border-b pb-3">
                  <h3 className="font-bold text-slate-900 text-lg">Atur Paket & Limit Tenant: {editingUser.company}</h3>
                  <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600">Nama Penanggung Jawab</label>
                    <input
                      type="text"
                      value={editingUser.name}
                      onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                      className="w-full mt-1 p-2.5 border rounded-lg text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-600">Email</label>
                      <input
                        type="email"
                        value={editingUser.email}
                        onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                        className="w-full mt-1 p-2.5 border rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600">Nomor Telepon</label>
                      <input
                        type="text"
                        value={editingUser.phone}
                        onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                        className="w-full mt-1 p-2.5 border rounded-lg text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-600">Paket Langganan</label>
                      <select
                        value={editingUser.plan}
                        onChange={(e: any) => setEditingUser({ ...editingUser, plan: e.target.value })}
                        className="w-full mt-1 p-2.5 border rounded-lg text-sm"
                      >
                        <option value="Starter">Starter (2 GB)</option>
                        <option value="Pro">Pro (5 GB)</option>
                        <option value="Enterprise">Enterprise (10 GB)</option>
                        <option value="Custom">Custom</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600">Batas Kuota Storage (MB)</label>
                      <input
                        type="number"
                        value={editingUser.storageLimitMB}
                        onChange={(e) => setEditingUser({ ...editingUser, storageLimitMB: Number(e.target.value) })}
                        className="w-full mt-1 p-2.5 border rounded-lg text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-600">Biaya Bulanan (Rp)</label>
                      <input
                        type="number"
                        value={editingUser.monthlyFee}
                        onChange={(e) => setEditingUser({ ...editingUser, monthlyFee: Number(e.target.value) })}
                        className="w-full mt-1 p-2.5 border rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600">Tanggal Expired Plan</label>
                      <input
                        type="date"
                        value={editingUser.expiredDate}
                        onChange={(e) => setEditingUser({ ...editingUser, expiredDate: e.target.value })}
                        className="w-full mt-1 p-2.5 border rounded-lg text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600">Status Akun</label>
                    <select
                      value={editingUser.status}
                      onChange={(e: any) => setEditingUser({ ...editingUser, status: e.target.value })}
                      className="w-full mt-1 p-2.5 border rounded-lg text-sm"
                    >
                      <option value="Active">Active</option>
                      <option value="Expiring Soon">Expiring Soon</option>
                      <option value="Suspended">Suspended</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <button
                    onClick={() => setEditingUser(null)}
                    className="px-4 py-2 border rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleSaveUser}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-1.5"
                  >
                    <Save className="w-4 h-4" /> Simpan Perubahan
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CONSULTATIONS & LEADS FORM */}
      {activeTab === "consultations" && (
        <div className="bg-white p-6 rounded-b-2xl border border-slate-200 border-t-0 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Inbox Formulir Konsultasi (tatalora.com)</h2>
              <p className="text-sm text-slate-500">Permintaan konsultasi langsung dari form landing page. Langsung hubungi via WhatsApp.</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="p-2 border border-slate-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">Semua Status</option>
                <option value="NEW">Baru (NEW)</option>
                <option value="CONTACTED">Sudah Dihubungi</option>
                <option value="QUALIFIED">Qualified Lead</option>
                <option value="CONVERTED">Converted (Klien)</option>
              </select>
              <button 
                onClick={loadConsultations}
                disabled={loadingLeads}
                className="p-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
                title="Refresh leads"
              >
                <RefreshCw className={`w-4 h-4 ${loadingLeads ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="p-4">Nama & Posisi</th>
                  <th className="p-4">Perusahaan & Industri</th>
                  <th className="p-4">WhatsApp & Kontak</th>
                  <th className="p-4">Budget & Kendala Operasional</th>
                  <th className="p-4">Status Lead</th>
                  <th className="p-4 text-center">Tindakan Cepat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredConsultations.map((lead) => {
                  const cleanPhone = lead.phone?.replace(/[^0-9]/g, "") || ""
                  const waNumber = cleanPhone.startsWith("0") ? "62" + cleanPhone.slice(1) : cleanPhone
                  const waMessage = encodeURIComponent(`Halo Bpk/Ibu ${lead.name}, salam dari TATALORA ERP. Kami telah menerima permohonan konsultasi Anda mengenai sistem ${lead.company_name}. Bisakah kami bantu diskusikan kebutuhan operasional Anda?`)

                  return (
                    <tr key={lead.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4">
                        <div className="font-semibold text-slate-900">{lead.name}</div>
                        <div className="text-xs text-slate-500">{lead.position || "Owner / Management"}</div>
                        <div className="text-[11px] text-slate-400 mt-1">
                          {lead.created_at ? new Date(lead.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-"}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-slate-800">{lead.company_name || "-"}</div>
                        <span className="inline-block mt-1 px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                          {lead.industry || "General"}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="font-medium text-slate-800 flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-emerald-600" />
                          {lead.phone}
                        </div>
                      </td>
                      <td className="p-4 max-w-xs">
                        <div className="text-xs font-semibold text-indigo-600 mb-1">
                          Budget: {lead.budget || "Fleksibel"}
                        </div>
                        <p className="text-xs text-slate-600 line-clamp-2" title={lead.notes}>
                          {lead.notes || "Tidak ada catatan tambahan."}
                        </p>
                      </td>
                      <td className="p-4">
                        <select
                          value={lead.status || "NEW"}
                          onChange={(e) => handleUpdateStatus(lead.id, e.target.value)}
                          className={`text-xs font-bold rounded-lg px-2.5 py-1.5 border border-slate-200 focus:outline-none ${
                            lead.status === "NEW" ? "bg-red-50 text-red-600" :
                            lead.status === "CONTACTED" ? "bg-blue-50 text-blue-600" :
                            lead.status === "QUALIFIED" ? "bg-purple-50 text-purple-600" :
                            "bg-emerald-50 text-emerald-600"
                          }`}
                        >
                          <option value="NEW">Baru (NEW)</option>
                          <option value="CONTACTED">Contacted</option>
                          <option value="QUALIFIED">Qualified</option>
                          <option value="CONVERTED">Converted</option>
                        </select>
                      </td>
                      <td className="p-4 text-center">
                        <a
                          href={`https://wa.me/${waNumber}?text=${waMessage}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-all"
                        >
                          <MessageSquare className="w-3.5 h-3.5" /> Chat WhatsApp
                        </a>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: WORKSPACE ADMIN & TODO LIST */}
      {activeTab === "workspace" && (
        <div className="bg-white p-6 rounded-b-2xl border border-slate-200 border-t-0 shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Workspace Internal & Todo List Admin</h2>
            <p className="text-sm text-slate-500">Checklist tugas harian, follow up prospek, maintenance server, & operasional admin.</p>
          </div>

          {/* Form Tambah Todo */}
          <form onSubmit={handleAddTodo} className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row gap-3 items-center">
            <input
              type="text"
              placeholder="Tuliskan tugas admin / todolist baru..."
              value={newTodoTask}
              onChange={(e) => setNewTodoTask(e.target.value)}
              className="flex-1 w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
            />
            <div className="flex w-full md:w-auto items-center gap-2">
              <select
                value={newTodoPriority}
                onChange={(e: any) => setNewTodoPriority(e.target.value)}
                className="p-2.5 border border-slate-300 rounded-lg text-sm bg-white"
              >
                <option value="High">Tinggi (High)</option>
                <option value="Medium">Sedang (Medium)</option>
                <option value="Low">Rendah (Low)</option>
              </select>
              <input
                type="date"
                value={newTodoDueDate}
                onChange={(e) => setNewTodoDueDate(e.target.value)}
                className="p-2 border border-slate-300 rounded-lg text-sm bg-white"
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-indigo-600 text-white font-medium text-sm rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-sm"
              >
                <Plus className="w-4 h-4" /> Tambah Todo
              </button>
            </div>
          </form>

          {/* List Todos */}
          <div className="space-y-2">
            {todos.map((item) => (
              <div
                key={item.id}
                className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                  item.completed 
                    ? "bg-slate-50 border-slate-200 opacity-60" 
                    : "bg-white border-slate-200 shadow-sm hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <button onClick={() => toggleTodo(item.id)} className="text-indigo-600 focus:outline-none">
                    {item.completed ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5 text-slate-400" />}
                  </button>
                  <span className={`text-sm font-medium ${item.completed ? "line-through text-slate-400" : "text-slate-800"}`}>
                    {item.task}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                    item.priority === "High" ? "bg-red-100 text-red-700" :
                    item.priority === "Medium" ? "bg-amber-100 text-amber-700" :
                    "bg-slate-100 text-slate-700"
                  }`}>
                    {item.priority}
                  </span>
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> {item.dueDate}
                  </span>
                  <button
                    onClick={() => deleteTodo(item.id)}
                    className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: CRM & CUSTOMER DATABASE */}
      {activeTab === "crm" && (
        <div className="bg-white p-6 rounded-b-2xl border border-slate-200 border-t-0 shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Modul CRM & Basis Data Pelanggan</h2>
            <p className="text-sm text-slate-500">Pusat kontrol manajemen kontak klien, pipeline prospek, dan riwayat transaksi bisnis.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border border-slate-200 rounded-2xl p-6 hover:shadow-md transition-shadow bg-gradient-to-br from-indigo-50/50 to-white">
              <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center mb-4">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Database Pelanggan & Mitra (Partners)</h3>
              <p className="text-sm text-slate-600 mt-2">
                Kelola direktori kontak pelanggan lengkap: alamat kantor, NPWP, histori piutang/AP/AR, serta batas kredit transaksi.
              </p>
              <div className="mt-6 flex items-center gap-3">
                <Link
                  href="/crm/partners"
                  className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1.5"
                >
                  Buka Data Pelanggan <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/crm/partners/new"
                  className="px-4 py-2 border border-slate-300 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors"
                >
                  + Tambah Kontak Baru
                </Link>
              </div>
            </div>

            <div className="border border-slate-200 rounded-2xl p-6 hover:shadow-md transition-shadow bg-gradient-to-br from-purple-50/50 to-white">
              <div className="w-12 h-12 rounded-xl bg-purple-600 text-white flex items-center justify-center mb-4">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Pipeline CRM & Penjualan (Opportunities)</h3>
              <p className="text-sm text-slate-600 mt-2">
                Pantau proses follow up penawaran, negosiasi kontrak, estimasi nilai closing transaksi, dan tahap konversi penjualan.
              </p>
              <div className="mt-6 flex items-center gap-3">
                <Link
                  href="/crm"
                  className="px-4 py-2 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-1.5"
                >
                  Buka Dashboard CRM <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/sales"
                  className="px-4 py-2 border border-slate-300 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Daftar Penjualan
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
