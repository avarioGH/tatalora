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
  ArrowLeft, Save, UserCircle, MapPin, Building, FileText, Clock, Wallet, Info, Plus
} from "lucide-react"

export default function CreateContactPage() {
  const router = useRouter()
  
  // Custom states for dynamically adding fields
  const [emails, setEmails] = useState<string[]>([""])
  const [activeType, setActiveType] = useState("")

  const addEmail = () => setEmails([...emails, ""])
  const updateEmail = (index: number, val: string) => {
    const newEmails = [...emails]
    newEmails[index] = val
    setEmails(newEmails)
  }

  // Define the dynamic color for the Trigger based on selected value
  const getTriggerColor = () => {
    switch (activeType) {
      case "vendor": return "bg-rose-500 text-white border-rose-500"
      case "pegawai": return "bg-teal-500 text-white border-teal-500"
      case "pelanggan": return "bg-blue-500 text-white border-blue-500"
      case "investor": return "bg-slate-800 text-white border-slate-800"
      case "lainnya": return "bg-purple-700 text-white border-purple-700"
      default: return "bg-background text-muted-foreground"
    }
  }

  return (
    <div className="p-6 md:p-8 space-y-6 bg-background min-h-screen">
      
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
            Tambah Kontak
          </h1>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button variant="outline" className="w-full sm:w-auto bg-card text-foreground border-border" onClick={() => router.back()}>Batal</Button>
          <Button className="w-full sm:w-auto gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
            <Save className="w-4 h-4" /> Simpan Kontak
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* Left Column (Main Form) */}
        <div className="xl:col-span-3 space-y-6">
          
          <Card className="border-0 shadow-sm ring-1 ring-border bg-card">
            <CardHeader className="bg-muted/30 rounded-t-xl pb-4 border-b border-border flex flex-row items-center gap-2">
              <UserCircle className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg text-foreground">Profil Kontak</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              
              <div className="flex items-center text-blue-600 font-medium text-sm cursor-pointer hover:underline">
                <Plus className="w-4 h-4 mr-1" /> Tampilkan Foto
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                <div className="space-y-2">
                  <Label className="text-foreground">Tipe Kontak <span className="text-rose-500">*</span></Label>
                  <Select onValueChange={(val) => setActiveType(val as string)}>
                    <SelectTrigger className={`border-border font-medium transition-colors ${getTriggerColor()}`}>
                      <SelectValue placeholder="Pilih tipe kontak" />
                    </SelectTrigger>
                    <SelectContent className="p-0 border-0 overflow-hidden rounded-md shadow-xl bg-card">
                      {/* 
                        The user explicitly requested this colorful hover UI.
                        We set solid background colors for each item and white text, 
                        with a slight darkening hover effect. 
                      */}
                      <SelectItem 
                        value="vendor" 
                        className="bg-rose-500 text-white font-medium focus:bg-rose-600 focus:text-white rounded-none h-11 border-b border-rose-600/20"
                      >
                        Vendor
                      </SelectItem>
                      <SelectItem 
                        value="pegawai" 
                        className="bg-teal-500 text-white font-medium focus:bg-teal-600 focus:text-white rounded-none h-11 border-b border-teal-600/20"
                      >
                        Pegawai
                      </SelectItem>
                      <SelectItem 
                        value="pelanggan" 
                        className="bg-blue-500 text-white font-medium focus:bg-blue-600 focus:text-white rounded-none h-11 border-b border-blue-600/20"
                      >
                        Pelanggan
                      </SelectItem>
                      <SelectItem 
                        value="investor" 
                        className="bg-slate-800 text-white font-medium focus:bg-slate-900 focus:text-white rounded-none h-11 border-b border-slate-900/20"
                      >
                        Investor
                      </SelectItem>
                      <SelectItem 
                        value="lainnya" 
                        className="bg-purple-700 text-white font-medium focus:bg-purple-800 focus:text-white rounded-none h-11"
                      >
                        Lainnya
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-foreground">Grup</Label>
                  <Select>
                    <SelectTrigger className="bg-muted border-border">
                      <SelectValue placeholder="Semua Grup" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="umum">Umum</SelectItem>
                      <SelectItem value="vip">VIP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="space-y-2 md:col-span-1">
                  <Label className="text-foreground">Sapaan</Label>
                  <Select>
                    <SelectTrigger className="bg-muted border-border">
                      <SelectValue placeholder="Sapaan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bapak">Bapak</SelectItem>
                      <SelectItem value="ibu">Ibu</SelectItem>
                      <SelectItem value="sdr">Sdr.</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-3">
                  <Label className="text-foreground">Nama <span className="text-rose-500">*</span></Label>
                  <Input placeholder="Nama lengkap" className="bg-muted border-border" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-foreground">Nomor</Label>
                  <Input placeholder="Nomor kontak (cth: CUST-001)" className="bg-muted border-border font-medium" />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Perusahaan</Label>
                  <Input placeholder="Nama perusahaan" className="bg-muted border-border" />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-foreground">Telepon</Label>
                <Input placeholder="Telepon utama" className="bg-muted border-border" />
              </div>

              <div className="space-y-2">
                <Label className="text-foreground">Email</Label>
                {emails.map((email, idx) => (
                  <Input 
                    key={idx} 
                    placeholder="Alamat email" 
                    value={email}
                    onChange={(e) => updateEmail(idx, e.target.value)}
                    className="bg-muted border-border mb-2" 
                  />
                ))}
                <div className="flex items-center text-blue-600 font-medium text-sm cursor-pointer hover:underline mt-1" onClick={addEmail}>
                  <Plus className="w-4 h-4 mr-1" /> Tambah email
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="space-y-2">
                  <Label className="text-foreground">Telepon sekunder</Label>
                  <Input placeholder="Telepon sekunder" className="bg-muted border-border" />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Fax</Label>
                  <Input placeholder="Fax" className="bg-muted border-border" />
                </div>
              </div>

            </CardContent>
          </Card>

          {/* Collapsible Detail Sections */}
          <Accordion type="multiple" className="w-full bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            
            <AccordionItem value="alamat-penagihan" className="border-border">
              <AccordionTrigger className="hover:bg-muted/50 px-6 py-4 text-sm font-semibold text-foreground">
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-blue-500" />
                  Alamat Penagihan
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 py-4 bg-muted/20 border-t border-border space-y-4">
                <Input placeholder="Jalan, RT/RW..." className="bg-background" />
                <div className="grid grid-cols-2 gap-4">
                  <Input placeholder="Kota/Kabupaten" className="bg-background" />
                  <Input placeholder="Kode Pos" className="bg-background" />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="pajak" className="border-border">
              <AccordionTrigger className="hover:bg-muted/50 px-6 py-4 text-sm font-semibold text-foreground">
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-blue-500" />
                  Identitas Pajak & Legalitas
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 py-4 bg-muted/20 border-t border-border space-y-4">
                <div className="space-y-2">
                  <Label>NPWP</Label>
                  <Input placeholder="Nomor Pokok Wajib Pajak" className="bg-background" />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="jam-operasional" className="border-border">
              <AccordionTrigger className="hover:bg-muted/50 px-6 py-4 text-sm font-semibold text-foreground">
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-blue-500" />
                  Jam Operasional
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 py-4 bg-muted/20 border-t border-border text-muted-foreground text-sm">
                Formulir pengaturan jam buka tutup kontak.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="alamat-pengiriman" className="border-border">
              <AccordionTrigger className="hover:bg-muted/50 px-6 py-4 text-sm font-semibold text-foreground">
                <div className="flex items-center gap-3">
                  <Building className="h-4 w-4 text-blue-500" />
                  Alamat Pengiriman
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 py-4 bg-muted/20 border-t border-border text-muted-foreground text-sm">
                Formulir alamat pengiriman barang (bisa disamakan dengan alamat penagihan).
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="rekening" className="border-border">
              <AccordionTrigger className="hover:bg-muted/50 px-6 py-4 text-sm font-semibold text-foreground">
                <div className="flex items-center gap-3">
                  <Wallet className="h-4 w-4 text-blue-500" />
                  Rekening Bank
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 py-4 bg-muted/20 border-t border-border space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nama Bank</Label>
                    <Input placeholder="Contoh: BCA, Mandiri" className="bg-background" />
                  </div>
                  <div className="space-y-2">
                    <Label>Nomor Rekening</Label>
                    <Input placeholder="1234567890" className="bg-background" />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="pemetaan-akun" className="border-border">
              <AccordionTrigger className="hover:bg-muted/50 px-6 py-4 text-sm font-semibold text-foreground">
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-blue-500" />
                  Pemetaan Akun
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 py-4 bg-muted/20 border-t border-border text-muted-foreground text-sm">
                Pemetaan akun piutang dan hutang khusus untuk kontak ini (Default Accounts).
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="info-tambahan" className="border-border border-b-0">
              <AccordionTrigger className="hover:bg-muted/50 px-6 py-4 text-sm font-semibold text-foreground">
                <div className="flex items-center gap-3">
                  <Info className="h-4 w-4 text-blue-500" />
                  Informasi Tambahan
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 py-4 bg-muted/20 border-t border-border text-muted-foreground text-sm">
                Catatan khusus, termin pembayaran default, atau batas limit kredit.
              </AccordionContent>
            </AccordionItem>

          </Accordion>

        </div>

        {/* Right Column (Instructions / Tips) */}
        <div className="xl:col-span-1 hidden xl:block">
          <Card className="border-0 shadow-sm ring-1 ring-border sticky top-6 bg-card">
            <CardHeader className="bg-blue-500/10 rounded-t-xl pb-4 border-b border-blue-500/20">
              <CardTitle className="text-lg text-blue-700 flex items-center gap-2">
                <Info className="h-5 w-5" />
                Tips Pengisian
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4 text-sm text-muted-foreground">
              <p>
                <strong>Tipe Kontak:</strong><br/>
                Sangat penting untuk memilih tipe kontak yang benar (Pelanggan, Vendor, atau Pegawai) karena akan mempengaruhi pemetaan akun jurnal secara otomatis.
              </p>
              <p>
                <strong>Kontak Multi-Peran:</strong><br/>
                Jika kontak adalah Pelanggan sekaligus Vendor, Anda bisa mencentang opsi multi-peran pada tab Pemetaan Akun.
              </p>
              <p>
                Pastikan email yang Anda masukkan valid, karena sistem dapat mengirimkan invoice secara otomatis ke alamat tersebut.
              </p>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  )
}
