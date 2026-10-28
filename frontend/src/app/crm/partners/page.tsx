"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { 
  Card, CardContent
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table"
import { 
  Search, Filter, Plus, Users, ChevronDown, FolderOpen, Mail, Phone, Building2, Trash2
} from "lucide-react"
import { api } from "@/lib/api"

export default function ContactsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("Semua")
  const [search, setSearch] = useState("")
  const [contacts, setContacts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const tabs = ["Semua", "Pelanggan", "Vendor"]

  const fetchContacts = async () => {
    setLoading(true)
    try {
      const res = await api.get('/customers?limit=100').catch(() => ({ data: { data: [] } }))
      const list = res.data?.data || res.data || []
      setContacts(list)
    } catch (err) {
      console.error("Error loading contacts:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchContacts()
  }, [])

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Hapus kontak ${name}?`)) return
    try {
      await api.delete(`/customers/${id}`)
      fetchContacts()
    } catch (err: any) {
      alert("Gagal menghapus kontak: " + (err.response?.data?.message || err.message))
    }
  }

  const getTypeBadge = (roles: string[] | string) => {
    const roleList = Array.isArray(roles) ? roles : [roles]
    const isVendor = roleList.some(r => r?.toUpperCase() === 'VENDOR' || r?.toUpperCase() === 'SUPPLIER')
    const isCustomer = roleList.some(r => r?.toUpperCase() === 'CUSTOMER')

    if (isVendor && isCustomer) {
      return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-0">Pelanggan & Vendor</Badge>
    }
    if (isVendor) {
      return <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 border-0">Vendor</Badge>
    }
    return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-0">Pelanggan</Badge>
  }

  const filteredData = contacts.filter(c => {
    const matchesSearch = c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.code?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search) ||
      c.email?.toLowerCase().includes(search.toLowerCase())
    if (!matchesSearch) return false

    const roleList = Array.isArray(c.roles) ? c.roles : [c.roles]
    const isVendor = roleList.some((r: any) => r?.toUpperCase() === 'VENDOR' || r?.toUpperCase() === 'SUPPLIER')
    const isCustomer = roleList.some((r: any) => r?.toUpperCase() === 'CUSTOMER') || (!isVendor)

    if (activeTab === "Pelanggan") return isCustomer
    if (activeTab === "Vendor") return isVendor
    return true
  })

  return (
    <div className="p-6 md:p-8 space-y-6 bg-background min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            Daftar Kontak (Pelanggan & Vendor)
          </h1>
          <p className="text-muted-foreground mt-1">Database lengkap pelanggan dan mitra vendor terintegrasi ke seluruh modul ERP.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Link href="/crm/partners/create">
            <Button className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
              <Plus className="h-4 w-4" /> Tambah Kontak Baru
            </Button>
          </Link>
        </div>
      </div>

      <Card className="border-0 shadow-sm ring-1 ring-border overflow-hidden bg-card">
        {/* Filter Bar */}
        <div className="p-4 border-b border-border flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Cari nama, nomor HP, atau email..." 
              className="pl-9 bg-muted border-border h-9 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex gap-1 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`
                  px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap
                  ${activeTab === tab 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }
                `}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground">Memuat data kontak...</div>
          ) : filteredData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
              <div className="w-16 h-16 mb-4 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600">
                <FolderOpen className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-1">Tidak ada kontak ditemukan</h3>
              <p className="text-muted-foreground max-w-sm mb-4 text-xs">
                Tambahkan pelanggan atau vendor baru ke dalam buku kontak perusahaan Anda.
              </p>
              <Link href="/crm/partners/create">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                  + Tambah Kontak Baru
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]"><input type="checkbox" className="rounded border-gray-300" /></TableHead>
                  <TableHead>Kode / ID</TableHead>
                  <TableHead>Nama Kontak</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Perusahaan</TableHead>
                  <TableHead>Telepon / WhatsApp</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Alamat</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((c) => (
                  <TableRow key={c.id} className="hover:bg-muted/30">
                    <TableCell><input type="checkbox" className="rounded border-gray-300" /></TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{c.code || '-'}</TableCell>
                    <TableCell className="font-semibold text-foreground">{c.name}</TableCell>
                    <TableCell>{getTypeBadge(c.roles)}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{c.company_name || '-'}</TableCell>
                    <TableCell className="font-medium text-xs flex items-center gap-1.5 py-4">
                      <Phone className="w-3 h-3 text-emerald-600" /> {c.phone || '-'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {c.email ? <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {c.email}</span> : '-'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate" title={c.address}>
                      {c.address || '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(c.id, c.name)}
                        className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 h-8 w-8"
                        title="Hapus Kontak"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
