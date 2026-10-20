"use client"

import React, { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter 
} from "@/components/ui/dialog"
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select"
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table"
import { 
  Store, Receipt, CreditCard, Percent, Layers, Printer, Globe, Lock, Key, CheckCircle2,
  Wallet, Tag, ShoppingBag, ListOrdered, ChevronDown, Plus, CreditCardIcon, Landmark, Search, FileText, Settings, Settings2, DownloadCloud
} from "lucide-react"

export default function PosSettingsPage() {
  const [activeTab, setActiveTab] = useState("Kasir")
  const [showToast, setShowToast] = useState(false)

  // Modals state
  const [isNonTunaiModalOpen, setIsNonTunaiModalOpen] = useState(false)
  const [isLantaiModalOpen, setIsLantaiModalOpen] = useState(false)
  const [nonTunaiType, setNonTunaiType] = useState("EDC")

  const saveSettings = () => {
    setShowToast(true)
    setTimeout(() => setShowToast(false), 3000)
  }

  const menuUtama = ["Kasir", "Struk & Biaya", "Pembayaran Non Tunai", "Pajak", "Lantai"]
  const menuPerangkat = ["Printer"]
  const menuLainnya = ["Web Order", "Ganti PIN", "Reset PIN"]

  const renderSidebarMenu = (items: string[]) => {
    return items.map(item => (
      <button 
        key={item}
        onClick={() => setActiveTab(item)} 
        className={`w-full flex items-center px-3 py-2 text-sm rounded-md transition-colors ${activeTab === item ? 'bg-indigo-50 text-indigo-600 font-medium' : 'text-foreground hover:bg-muted'}`}
      >
        {item}
      </button>
    ))
  }

  return (
    <div className="flex h-full w-full bg-background relative overflow-hidden">
      
      {/* Settings Sub-Sidebar */}
      <div className="w-[240px] border-r border-border bg-card shrink-0 flex flex-col h-full overflow-y-auto">
        <div className="p-6 pb-2">
          <h2 className="text-xl font-bold text-foreground">Pengaturan</h2>
        </div>
        
        <div className="p-3 space-y-1">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-3 mt-4 flex items-center gap-2">
            <Store className="w-4 h-4" /> Utama
          </div>
          {renderSidebarMenu(menuUtama)}

          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-3 mt-6 flex items-center gap-2">
            <Printer className="w-4 h-4" /> Perangkat
          </div>
          {renderSidebarMenu(menuPerangkat)}

          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-3 mt-6 flex items-center gap-2">
            <Globe className="w-4 h-4" /> Lainnya
          </div>
          {renderSidebarMenu(menuLainnya)}
        </div>
      </div>

      {/* Main Settings Content */}
      <div className="flex-1 bg-muted/10 overflow-y-auto p-6 md:p-8 relative">
        
        {/* Toast Notification */}
        <div className={`absolute top-6 left-1/2 -translate-x-1/2 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-full shadow-md border border-emerald-200 flex items-center gap-2 transition-all duration-300 z-50 ${showToast ? 'opacity-100 transform-none' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
          <CheckCircle2 className="w-4 h-4" />
          <span className="text-sm font-medium">Berhasil mengubah data.</span>
        </div>

        {/* Header */}
        <div className="flex justify-between items-center mb-8 max-w-5xl mx-auto">
          <h1 className="text-2xl font-bold text-foreground">{activeTab}</h1>
          <div className="flex items-center gap-4">
            {(activeTab === "Kasir" || activeTab === "Printer") && (
              <>
                <Input placeholder="Cari pengaturan..." className="w-64 bg-card" />
                <Button variant="link" className="text-indigo-600">Buka semua</Button>
                {activeTab === "Kasir" && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground bg-card border border-border px-3 py-1.5 rounded-md">
                    Outlet <span className="font-semibold text-foreground ml-2">Default Outlet</span>
                  </div>
                )}
              </>
            )}
            
            {(activeTab === "Pembayaran Non Tunai" || activeTab === "Lantai") && (
              <>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Cari..." className="w-64 pl-9 bg-card" />
                </div>
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2" onClick={() => activeTab === 'Lantai' ? setIsLantaiModalOpen(true) : setIsNonTunaiModalOpen(true)}>
                  <Plus className="w-4 h-4" /> Tambah
                </Button>
              </>
            )}

            {activeTab === "Pajak" && (
              <Button variant="outline" className="border-indigo-600 text-indigo-600 gap-2 hover:bg-indigo-50">
                <Settings2 className="w-4 h-4" /> Reset
              </Button>
            )}
          </div>
        </div>

        <div className="max-w-5xl mx-auto space-y-6 pb-20">
          
          {/* TAB: KASIR */}
          {activeTab === "Kasir" && (
            <>
              {/* Section 1: Shift & Kas */}
              <Card className="border border-border shadow-sm bg-card overflow-hidden">
                <div className="bg-muted/30 px-6 py-4 flex items-center justify-between border-b border-border cursor-pointer hover:bg-muted/50 transition-colors" onClick={saveSettings}>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Wallet className="w-5 h-5" /></div>
                    <div>
                      <h3 className="font-semibold text-foreground text-base">Shift & Kas</h3>
                      <p className="text-xs text-muted-foreground">Kas modal saat buka/tutup kasir dan batas kas keluar</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    3 pengaturan <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
                <CardContent className="p-6 space-y-8">
                  <div className="flex items-start justify-between gap-8">
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground text-sm">Buka Kasir</h4>
                      <p className="text-xs text-muted-foreground mt-1 mb-3">Tentukan Jumlah Kas Modal<br/>Default memasukkan jumlah kas modal setiap kali buka kasir</p>
                      <Input defaultValue="1.000.000" className="w-64" onChange={saveSettings} />
                    </div>
                    <Switch defaultChecked onCheckedChange={saveSettings} />
                  </div>
                  <div className="flex items-start justify-between gap-8 pt-6 border-t border-border border-dashed">
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground text-sm">Tutup Kasir</h4>
                      <p className="text-xs text-muted-foreground mt-1">Tentukan Jumlah Kas Modal<br/>Default memasukkan jumlah kas modal setiap kali tutup kasir</p>
                    </div>
                    <Switch defaultChecked onCheckedChange={saveSettings} />
                  </div>
                  <div className="flex items-start justify-between gap-8 pt-6 border-t border-border border-dashed">
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground text-sm">Kas Keluar</h4>
                      <p className="text-xs text-muted-foreground mt-1 mb-3">Tentukan Batasan Kas Keluar<br/>Mengizinkan kasir untuk mengambil uang kas sesuai yang telah ditentukan</p>
                      <Input defaultValue="250.000" className="w-64" onChange={saveSettings} />
                    </div>
                    <Switch defaultChecked onCheckedChange={saveSettings} />
                  </div>
                </CardContent>
              </Card>

              {/* Section 2: Harga & Diskon */}
              <Card className="border border-border shadow-sm bg-card overflow-hidden">
                <div className="bg-muted/30 px-6 py-4 flex items-center justify-between border-b border-border cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Tag className="w-5 h-5" /></div>
                    <div>
                      <h3 className="font-semibold text-foreground text-base">Harga & Diskon</h3>
                      <p className="text-xs text-muted-foreground">Diskon, harga manual, pajak per item, dan service charge</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    5 pengaturan <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              </Card>

              {/* Section 3: Jenis Order */}
              <Card className="border border-border shadow-sm bg-card overflow-hidden">
                <div className="bg-muted/30 px-6 py-4 flex items-center justify-between border-b border-border cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><ShoppingBag className="w-5 h-5" /></div>
                    <div>
                      <h3 className="font-semibold text-foreground text-base">Jenis Order & Biaya</h3>
                      <p className="text-xs text-muted-foreground">Jenis order di kasir dan biaya otomatis per jenis order</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    3 pengaturan <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              </Card>

              {/* Section 4: Antrian */}
              <Card className="border border-border shadow-sm bg-card overflow-hidden">
                <div className="bg-muted/30 px-6 py-4 flex items-center justify-between border-b border-border cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><ListOrdered className="w-5 h-5" /></div>
                    <div>
                      <h3 className="font-semibold text-foreground text-base">Antrian & Otorisasi</h3>
                      <p className="text-xs text-muted-foreground">Nomor antrian dan otorisasi pimpinan</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    2 pengaturan <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              </Card>
            </>
          )}

          {/* TAB: PEMBAYARAN NON TUNAI */}
          {activeTab === "Pembayaran Non Tunai" && (
            <Card className="border border-border shadow-sm bg-card overflow-hidden min-h-[400px]">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="font-semibold">Jenis Pembayaran</TableHead>
                    <TableHead className="font-semibold">Nama Pembayaran</TableHead>
                    <TableHead className="font-semibold">Provider/Bank</TableHead>
                    <TableHead className="font-semibold">Akun COA</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={5} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <CreditCard className="w-12 h-12 mb-4 opacity-20" />
                        <p>Belum ada data Pembayaran Non Tunai di sini</p>
                      </div>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Card>
          )}

          {/* TAB: PAJAK */}
          {activeTab === "Pajak" && (
            <div className="space-y-6">
              <p className="text-sm text-muted-foreground">Silakan pilih pajak sesuai dengan ketentuan perusahaan Anda. Pajak yang dipilih akan digunakan untuk semua transaksi di POS Anda.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-2 border-indigo-500 bg-indigo-50/30 cursor-pointer shadow-sm relative overflow-hidden">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-4 border-indigo-600 bg-white"></div>
                  <CardContent className="p-6 pl-12">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-foreground text-lg mb-2">PPN</h3>
                        <p className="text-sm text-muted-foreground mb-1">Nilai Pajak (%):</p>
                        <p className="text-sm text-muted-foreground">Pemotongan: <span className="font-medium text-foreground">Tidak</span></p>
                      </div>
                      <div className="text-3xl font-light text-foreground">11%</div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-border bg-card cursor-pointer hover:border-indigo-500/50 transition-colors shadow-sm relative overflow-hidden">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-muted-foreground bg-white"></div>
                  <CardContent className="p-6 pl-12 opacity-70">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-foreground text-lg mb-2">PPH</h3>
                        <p className="text-sm text-muted-foreground mb-1">Nilai Pajak (%):</p>
                        <p className="text-sm text-muted-foreground">Pemotongan: <span className="font-medium text-foreground">Ya</span></p>
                      </div>
                      <div className="text-3xl font-light text-foreground">10%</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* TAB: LANTAI */}
          {activeTab === "Lantai" && (
            <Card className="border border-border shadow-sm bg-card overflow-hidden min-h-[400px]">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="font-semibold">Nama Lantai</TableHead>
                    <TableHead className="font-semibold text-center">Nama Outlet</TableHead>
                    <TableHead className="font-semibold text-center">Daftar Meja</TableHead>
                    <TableHead className="font-semibold text-right">Total Meja</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={4} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <Layers className="w-12 h-12 mb-4 opacity-20" />
                        <p>Tidak ada data</p>
                      </div>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Card>
          )}

          {/* TAB: PRINTER */}
          {activeTab === "Printer" && (
            <Card className="border border-border shadow-sm bg-card overflow-hidden">
              <CardContent className="p-0">
                <div className="p-6 bg-muted/20 border-b border-border">
                  <h3 className="font-bold text-foreground text-lg mb-1 flex items-center gap-2">
                    <Printer className="w-5 h-5" /> QZ Tray Belum Terinstall/Dijalankan
                  </h3>
                  <p className="text-sm text-muted-foreground">QZ Tray diperlukan untuk menggunakan fitur printer. Silakan install QZ Tray terlebih dahulu.</p>
                </div>
                
                <div className="grid grid-cols-3 divide-x divide-border border-b border-border bg-card">
                  <div className="p-6 flex flex-col items-center justify-center text-center gap-2">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-full"><DownloadCloud className="w-6 h-6" /></div>
                    <h4 className="font-semibold text-sm">Download QZ Tray</h4>
                    <p className="text-xs text-muted-foreground">Download QZ Tray dari website resmi</p>
                  </div>
                  <div className="p-6 flex flex-col items-center justify-center text-center gap-2 opacity-50">
                    <div className="p-3 bg-muted text-muted-foreground rounded-full"><Settings className="w-6 h-6" /></div>
                    <h4 className="font-semibold text-sm">Install QZ Tray</h4>
                    <p className="text-xs text-muted-foreground">Install aplikasi QZ Tray di komputer</p>
                  </div>
                  <div className="p-6 flex flex-col items-center justify-center text-center gap-2 opacity-50">
                    <div className="p-3 bg-muted text-muted-foreground rounded-full"><CheckCircle2 className="w-6 h-6" /></div>
                    <h4 className="font-semibold text-sm">Jalankan QZ Tray</h4>
                    <p className="text-xs text-muted-foreground">Buka aplikasi QZ Tray dan pastikan berjalan</p>
                  </div>
                </div>

                <div className="p-8 space-y-8">
                  <div>
                    <h4 className="font-semibold text-foreground mb-4">Langkah-langkah Instalasi:</h4>
                    <div className="space-y-6 text-sm text-muted-foreground">
                      <div>
                        <strong className="text-foreground">1. Download QZ Tray</strong>
                        <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
                          <li>Klik tombol Download QZ Tray di bawah ini</li>
                          <li>Atau kunjungi <a href="#" className="text-indigo-600 hover:underline">https://qz.io/download/</a></li>
                          <li>Pilih versi yang sesuai dengan sistem operasi Anda (Windows/macOS/Linux)</li>
                        </ul>
                      </div>
                      <div>
                        <strong className="text-foreground">2. Install QZ Tray</strong>
                        <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
                          <li>Buka file installer yang sudah didownload</li>
                          <li>Ikuti langkah-langkah instalasi</li>
                          <li>Pastikan QZ Tray terinstall dengan benar</li>
                        </ul>
                      </div>
                      <div>
                        <strong className="text-foreground">3. Jalankan QZ Tray</strong>
                        <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
                          <li>Buka aplikasi QZ Tray dari menu Start (Windows) atau Applications (macOS)</li>
                          <li>Icon QZ Tray akan muncul di system tray (Windows) atau menu bar (macOS)</li>
                          <li>Pastikan status QZ Tray menunjukkan "Running" atau "Connected"</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-center pt-4">
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                      <DownloadCloud className="w-4 h-4" /> Download QZ Tray
                    </Button>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-8">
                    <h4 className="font-semibold text-blue-900 flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4" /> Catatan Penting
                    </h4>
                    <ul className="list-disc list-inside text-sm text-blue-800 space-y-1 ml-2">
                      <li>QZ Tray harus berjalan setiap kali Anda menggunakan fitur printer</li>
                      <li>Pastikan QZ Tray tidak di-block oleh firewall atau antivirus</li>
                      <li>Jika menggunakan macOS, mungkin perlu memberikan permission di System Preferences</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      </div>

      {/* MODAL: TAMBAH PEMBAYARAN NON TUNAI */}
      <Dialog open={isNonTunaiModalOpen} onOpenChange={setIsNonTunaiModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Tambah Pembayaran Non Tunai</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Jenis Pembayaran <span className="text-rose-500">*</span></label>
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="outline" 
                  className={`gap-2 ${nonTunaiType === 'EDC' ? 'border-indigo-600 text-indigo-600 bg-indigo-50' : ''}`}
                  onClick={() => setNonTunaiType('EDC')}
                >
                  <CreditCardIcon className="w-4 h-4" /> EDC
                </Button>
                <Button 
                  variant="outline" 
                  className={`gap-2 ${nonTunaiType === 'Transfer Bank' ? 'border-indigo-600 text-indigo-600 bg-indigo-50' : ''}`}
                  onClick={() => setNonTunaiType('Transfer Bank')}
                >
                  <Landmark className="w-4 h-4" /> Transfer Bank
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Nama Pembayaran <span className="text-rose-500">*</span></label>
              <Input placeholder="Masukkan nama pembayaran" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Provider/Bank <span className="text-rose-500">*</span></label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bca">BCA</SelectItem>
                  <SelectItem value="mandiri">Mandiri</SelectItem>
                  <SelectItem value="bni">BNI</SelectItem>
                  <SelectItem value="qris">QRIS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Akun COA <span className="text-rose-500">*</span></label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih akun COA" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Kas BCA - 1101</SelectItem>
                  <SelectItem value="bank">Bank Mandiri - 1102</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNonTunaiModalOpen(false)}>Batal</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => setIsNonTunaiModalOpen(false)}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: TAMBAH LANTAI */}
      <Dialog open={isLantaiModalOpen} onOpenChange={setIsLantaiModalOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Tambah Lantai</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Nama <span className="text-rose-500">*</span></label>
              <Input placeholder="Nama lantai (misal: Lantai 1, Outdoor)" />
            </div>
            <div className="space-y-3 pt-4 border-t border-border">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-foreground">Daftar Meja</label>
                <Button variant="outline" size="sm" className="text-indigo-600 border-indigo-200 bg-indigo-50">
                  <Plus className="w-3 h-3 mr-1" /> Tambah Meja
                </Button>
              </div>
              <div className="border border-border rounded-lg bg-muted/20 min-h-[120px] flex flex-col items-center justify-center text-muted-foreground text-sm">
                <Layers className="w-8 h-8 mb-2 opacity-20" />
                Tidak ada data
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white w-full" onClick={() => setIsLantaiModalOpen(false)}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
