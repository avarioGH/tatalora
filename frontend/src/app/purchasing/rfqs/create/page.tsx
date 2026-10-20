"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { 
  Card, CardContent, CardHeader, CardTitle 
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select"
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table"
import { Switch } from "@/components/ui/switch"
import { 
  Plus, Trash2, ArrowLeft, Save, Paperclip, FileText, HelpCircle, FileCheck
} from "lucide-react"

export default function CreateRFQPage() {
  const router = useRouter()
  const [items, setItems] = useState([
    { id: 1, product: "", desc: "", qty: 1, unit: "", discount: "0%", price: 0, tax: "", total: 0 }
  ])

  const addRow = () => {
    setItems([...items, { id: Date.now(), product: "", desc: "", qty: 1, unit: "", discount: "0%", price: 0, tax: "", total: 0 }])
  }

  const removeRow = (id: number) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id))
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
              <FileCheck className="h-6 w-6 text-blue-600" />
            </div>
            Tambah Penawaran Pembelian
          </h1>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button variant="outline" className="w-full sm:w-auto bg-card text-foreground border-border" onClick={() => router.back()}>Batal</Button>
          <Button variant="outline" className="w-full sm:w-auto bg-card text-foreground border-border gap-2">
            <HelpCircle className="w-4 h-4" /> Panduan
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left Column (Main Form) */}
        <div className="xl:col-span-2 space-y-6">
          
          <Card className="border-0 shadow-sm ring-1 ring-border bg-card">
            <CardHeader className="bg-muted/30 rounded-t-xl pb-4 border-b border-border">
              <CardTitle className="text-lg flex items-center gap-2 text-foreground">
                <FileText className="h-5 w-5 text-muted-foreground" />
                Informasi Dokumen Penawaran
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                <div className="space-y-2">
                  <Label className="text-foreground">Vendor <span className="text-rose-500">*</span></Label>
                  <Select>
                    <SelectTrigger className="bg-muted border-border font-medium">
                      <SelectValue placeholder="Pilih kontak..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="v1">PT Surya Kayu</SelectItem>
                      <SelectItem value="v2">CV Logam Abadi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-foreground text-xs flex items-center justify-between">
                    <span>Nomor <HelpCircle className="w-3 h-3 inline ml-1 text-muted-foreground"/></span>
                  </Label>
                  <Input defaultValue="PQ/00001" className="bg-muted border-border font-medium" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label className="text-foreground">Tgl. Transaksi <span className="text-rose-500">*</span></Label>
                  <Input type="date" defaultValue="2026-10-10" className="bg-muted border-border" />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Kadaluarsa</Label>
                  <Input type="date" defaultValue="2026-11-09" className="bg-muted border-border" />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Termin</Label>
                  <Select defaultValue="net30">
                    <SelectTrigger className="bg-muted border-border">
                      <SelectValue placeholder="Pilih termin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cod">COD</SelectItem>
                      <SelectItem value="net15">Net 15</SelectItem>
                      <SelectItem value="net30">Net 30</SelectItem>
                      <SelectItem value="net60">Net 60</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-border pt-4">
                <div className="space-y-2">
                  <Label className="text-foreground text-xs flex items-center">
                    Referensi <HelpCircle className="w-3 h-3 inline ml-1 text-muted-foreground"/>
                  </Label>
                  <Input placeholder="Referensi internal/vendor" className="bg-muted border-border" />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground text-xs flex items-center">
                    Tag <HelpCircle className="w-3 h-3 inline ml-1 text-muted-foreground"/>
                  </Label>
                  <Select>
                    <SelectTrigger className="bg-muted border-border">
                      <SelectValue placeholder="Pilih Tag" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="reguler">Reguler</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex items-center gap-2 pt-2 text-blue-600 cursor-pointer hover:underline w-fit">
                <Plus className="w-4 h-4" /> <span className="text-sm font-medium">Tampilkan Informasi Pengiriman</span>
              </div>

            </CardContent>
          </Card>

          {/* Section 2: Items Table */}
          <Card className="border-0 shadow-sm ring-1 ring-border overflow-hidden bg-card">
            <CardHeader className="bg-muted/30 pb-4 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Input placeholder="Scan Barcode/SKU" className="bg-background border-border w-64 h-9" />
                <div className="flex items-center gap-2">
                  <Switch id="auto-add" className="scale-75" />
                  <Label htmlFor="auto-add" className="cursor-pointer text-xs text-muted-foreground">Tambah baris otomatis</Label>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="tax-inc" className="cursor-pointer text-xs text-muted-foreground">Harga termasuk pajak</Label>
                <Switch id="tax-inc" />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/50 border-y border-border">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="min-w-[150px] text-foreground font-semibold">Produk</TableHead>
                      <TableHead className="min-w-[120px] text-foreground font-semibold">Deskripsi</TableHead>
                      <TableHead className="w-[80px] text-foreground font-semibold">Kuantitas</TableHead>
                      <TableHead className="w-[100px] text-foreground font-semibold">Satuan</TableHead>
                      <TableHead className="w-[80px] text-foreground font-semibold">Disc</TableHead>
                      <TableHead className="min-w-[120px] text-foreground font-semibold">Harga</TableHead>
                      <TableHead className="w-[100px] text-foreground font-semibold">Pajak</TableHead>
                      <TableHead className="min-w-[120px] text-right text-foreground font-semibold">Total</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, index) => (
                      <TableRow key={item.id} className="group border-border hover:bg-muted/20">
                        <TableCell className="align-top pt-4">
                          <Select>
                            <SelectTrigger className="bg-card border-border">
                              <SelectValue placeholder="Pilih Produk" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="p1">Kayu Mahoni</SelectItem>
                              <SelectItem value="p2">Besi Beton</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="align-top pt-4">
                          <Input placeholder="Keterangan..." className="bg-card border-border" />
                        </TableCell>
                        <TableCell className="align-top pt-4">
                          <Input type="number" defaultValue="1" min="1" className="bg-card border-border" />
                        </TableCell>
                        <TableCell className="align-top pt-4">
                          <Select>
                            <SelectTrigger className="bg-card border-border text-muted-foreground">
                              <SelectValue placeholder="Pilih Satu..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pcs">Pcs</SelectItem>
                              <SelectItem value="box">Box</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="align-top pt-4">
                          <Input defaultValue="0%" className="bg-card border-border" />
                        </TableCell>
                        <TableCell className="align-top pt-4">
                          <Input type="number" placeholder="0" className="bg-card border-border text-right" />
                        </TableCell>
                        <TableCell className="align-top pt-4">
                          <Select>
                            <SelectTrigger className="bg-card border-border text-muted-foreground">
                              <SelectValue placeholder="-" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">-</SelectItem>
                              <SelectItem value="ppn">PPN 11%</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="align-top pt-4">
                          <Input type="number" placeholder="0" readOnly className="bg-muted border-border text-right font-medium" />
                        </TableCell>
                        <TableCell className="align-top pt-4 text-center">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => removeRow(item.id)}
                            className="text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                            disabled={items.length === 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="p-4 border-t border-border bg-muted/20">
                <Button variant="outline" onClick={addRow} className="gap-2 bg-card text-blue-600 border-border hover:bg-blue-500/10 hover:border-blue-500/30 w-full sm:w-auto justify-center">
                  <Plus className="h-4 w-4" /> Tambah baris
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Notes & Attachments */}
          <div className="space-y-4">
            <Card className="border-0 shadow-sm ring-1 ring-border bg-card overflow-hidden">
              <div className="px-4 py-3 bg-muted/30 border-b border-border flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors">
                <span className="text-sm font-medium text-foreground flex items-center gap-2">
                  <ChevronDownIcon className="w-4 h-4 text-muted-foreground" />
                  Pesan
                </span>
              </div>
              <CardContent className="p-4">
                <Textarea placeholder="Tuliskan pesan atau catatan untuk penawaran ini..." className="resize-none h-24 border-border bg-background focus-visible:ring-blue-500" />
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm ring-1 ring-border bg-card overflow-hidden">
              <div className="px-4 py-3 bg-muted/30 border-b border-border flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors">
                <span className="text-sm font-medium text-foreground flex items-center gap-2">
                  <ChevronDownIcon className="w-4 h-4 text-muted-foreground" />
                  Attachment
                </span>
              </div>
              <CardContent className="p-4">
                <div className="w-full border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center p-8 text-center hover:bg-muted/50 transition-colors cursor-pointer bg-background">
                  <div className="p-3 bg-blue-500/10 text-blue-500 rounded-full mb-3">
                    <Paperclip className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-medium text-foreground">Klik atau seret file ke area ini untuk mengunggah</p>
                  <p className="text-xs text-muted-foreground mt-2 list-disc list-inside">
                    <li>File size maximal 10 MB</li>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

        </div>

        {/* Right Column (Summary) */}
        <div className="xl:col-span-1">
          <Card className="border-0 shadow-sm ring-1 ring-border sticky top-6 bg-card">
            <CardHeader className="bg-muted/30 rounded-t-xl pb-4 border-b border-border">
              <CardTitle className="text-lg text-foreground">Ringkasan Penawaran</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground font-medium">Sub Total</span>
                <span className="font-semibold text-foreground">0</span>
              </div>
              
              <div className="flex justify-between items-center text-sm">
                <span className="text-blue-600 font-medium cursor-pointer hover:underline flex items-center"><Plus className="w-3 h-3 mr-1" /> Tambahan Diskon</span>
              </div>
              
              <div className="flex justify-between items-center text-sm">
                <span className="text-blue-600 font-medium cursor-pointer hover:underline flex items-center"><Plus className="w-3 h-3 mr-1" /> Biaya pengiriman</span>
              </div>
              
              <div className="flex justify-between items-center text-sm">
                <span className="text-blue-600 font-medium cursor-pointer hover:underline flex items-center"><Plus className="w-3 h-3 mr-1" /> Biaya Transaksi</span>
              </div>
              
              <div className="pt-4 mt-2 border-t border-border">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-foreground">Total</span>
                  <span className="text-lg font-bold text-foreground">0</span>
                </div>
              </div>

              <div className="pt-6">
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all py-6 text-base font-semibold gap-2">
                  <Save className="w-5 h-5" />
                  Simpan
                </Button>
              </div>

            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  )
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m6 9 6 6 6-6"/>
    </svg>
  )
}
