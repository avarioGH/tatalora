"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { 
  Card, CardContent, CardHeader, CardTitle 
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select"
import { 
  Accordion, AccordionContent, AccordionItem, AccordionTrigger 
} from "@/components/ui/accordion"
import { 
  ArrowLeft, Save, UserCircle, MapPin, Building, FileText, Wallet, Info, Plus, Loader2
} from "lucide-react"
import { api } from "@/lib/api"

export default function CreateContactPage() {
  const router = useRouter()
  
  const [submitting, setSubmitting] = useState(false)
  const [activeType, setActiveType] = useState("pelanggan")
  const [name, setName] = useState("")
  const [code, setCode] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [address, setAddress] = useState("")
  const [taxId, setTaxId] = useState("")
  const [bankName, setBankName] = useState("")
  const [bankAccount, setBankAccount] = useState("")

  const getTriggerColor = () => {
    switch (activeType) {
      case "vendor": return "bg-rose-500 text-white border-rose-500"
      case "pelanggan": return "bg-blue-500 text-white border-blue-500"
      default: return "bg-background text-muted-foreground"
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return alert("Nama kontak wajib diisi!")

    setSubmitting(true)
    try {
      const role = activeType === "vendor" ? "VENDOR" : "CUSTOMER"
      await api.post("/customers", {
        name: name.trim(),
        code: code.trim() || undefined,
        type: role,
        roles: [role],
        company_name: companyName.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        tax_id: taxId.trim() || undefined,
      })
      alert("Kontak baru berhasil disimpan ke database!")
      router.push("/crm/partners")
    } catch (err: any) {
      console.error(err)
      alert("Gagal menyimpan kontak: " + (err.response?.data?.message || err.message))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6 bg-background min-h-screen">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-muted-foreground mb-2 cursor-pointer hover:text-foreground transition-colors w-fit" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm font-medium">Kembali</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <UserCircle className="h-6 w-6 text-blue-600" />
            </div>
            Tambah Kontak Baru
          </h1>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button type="button" variant="outline" className="w-full sm:w-auto bg-card text-foreground border-border" onClick={() => router.back()}>
            Batal
          </Button>
          <Button type="submit" disabled={submitting} className="w-full sm:w-auto gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm font-semibold">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Simpan Kontak
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Left Column (Main Form) */}
        <div className="xl:col-span-3 space-y-6">
          <Card className="border-0 shadow-sm ring-1 border-border bg-card">
            <CardHeader className="bg-muted/30 rounded-t-xl pb-4 border-b border-border flex flex-row items-center gap-2">
              <UserCircle className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg text-foreground">Profil Kontak</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                <div className="space-y-2">
                  <Label className="text-foreground font-semibold">Tipe Kontak <span className="text-rose-500">*</span></Label>
                  <Select value={activeType} onValueChange={(val) => setActiveType(val as string)}>
                    <SelectTrigger className={`border-border font-medium transition-colors ${getTriggerColor()}`}>
                      <SelectValue placeholder="Pilih tipe kontak" />
                    </SelectTrigger>
                    <SelectContent className="p-0 border-0 overflow-hidden rounded-md shadow-xl bg-card">
                      <SelectItem 
                        value="pelanggan" 
                        className="bg-blue-500 text-white font-medium focus:bg-blue-600 focus:text-white rounded-none h-11 border-b border-blue-600/20"
                      >
                        Pelanggan (Customer)
                      </SelectItem>
                      <SelectItem 
                        value="vendor" 
                        className="bg-rose-500 text-white font-medium focus:bg-rose-600 focus:text-white rounded-none h-11"
                      >
                        Vendor / Supplier
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-foreground font-semibold">Kode / Nomor Kontak</Label>
                  <Input 
                    placeholder="Auto generate atau misal: CUST-001" 
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="bg-muted border-border font-medium" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-foreground font-semibold">Nama Kontak <span className="text-rose-500">*</span></Label>
                  <Input 
                    placeholder="Nama lengkap kontak / PIC" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="bg-muted border-border" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground font-semibold">Nama Perusahaan / PT / Toko</Label>
                  <Input 
                    placeholder="Nama badan usaha / perusahaan" 
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="bg-muted border-border" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-foreground font-semibold">Nomor Telepon / WhatsApp</Label>
                  <Input 
                    placeholder="0812xxxxxxxx" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="bg-muted border-border" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground font-semibold">Alamat Email</Label>
                  <Input 
                    type="email"
                    placeholder="email@perusahaan.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-muted border-border" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-foreground font-semibold">Alamat Lengkap</Label>
                <Input 
                  placeholder="Jalan, nomor, gedung, kota, provinsi..." 
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="bg-muted border-border" 
                />
              </div>

            </CardContent>
          </Card>

          {/* Collapsible Detail Sections */}
          <Accordion type="multiple" className="w-full bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <AccordionItem value="pajak" className="border-border">
              <AccordionTrigger className="hover:bg-muted/50 px-6 py-4 text-sm font-semibold text-foreground">
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-blue-500" />
                  Identitas Pajak & NPWP
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 py-4 bg-muted/20 border-t border-border space-y-4">
                <div className="space-y-2">
                  <Label>Nomor NPWP</Label>
                  <Input 
                    placeholder="Nomor Pokok Wajib Pajak (16 digit)" 
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    className="bg-background" 
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="rekening" className="border-border border-b-0">
              <AccordionTrigger className="hover:bg-muted/50 px-6 py-4 text-sm font-semibold text-foreground">
                <div className="flex items-center gap-3">
                  <Wallet className="h-4 w-4 text-blue-500" />
                  Rekening Bank Kontak
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 py-4 bg-muted/20 border-t border-border space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nama Bank</Label>
                    <Input 
                      placeholder="Contoh: BCA, Mandiri, BRI" 
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="bg-background" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nomor Rekening</Label>
                    <Input 
                      placeholder="Nomor rekening bank" 
                      value={bankAccount}
                      onChange={(e) => setBankAccount(e.target.value)}
                      className="bg-background" 
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {/* Right Column (Tips) */}
        <div className="xl:col-span-1 hidden xl:block">
          <Card className="border-0 shadow-sm ring-1 ring-border sticky top-6 bg-card">
            <CardHeader className="bg-blue-500/10 rounded-t-xl pb-4 border-b border-blue-500/20">
              <CardTitle className="text-lg text-blue-700 flex items-center gap-2">
                <Info className="h-5 w-5" />
                Tips Pengisian Kontak
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4 text-sm text-muted-foreground">
              <p>
                <strong>Tipe Kontak:</strong><br/>
                Pilih **Pelanggan** untuk transaksi penjualan faktur/kasir, atau **Vendor** untuk transaksi purchase order dan tagihan pembelian barang.
              </p>
              <p>
                <strong>Integrasi Otomatis:</strong><br/>
                Kontak yang Anda simpan di sini akan langsung muncul pada pilihan dropdown di modul **Penjualan (Sales)** dan modul **Pembelian (Purchasing)**.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  )
}
