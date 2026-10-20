"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription
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
import { 
  Plus, Trash2, ArrowLeft, Save, Paperclip, FileText, UserCircle, ShoppingCart
} from "lucide-react"

export default function CreatePurchaseInvoicePage() {
  const router = useRouter()
  const [items, setItems] = useState([
    { id: 1, product: "", desc: "", qty: 1, unit: "Pcs", discount: 0, price: 0, tax: false, total: 0 }
  ])

  const addRow = () => {
    setItems([...items, { id: Date.now(), product: "", desc: "", qty: 1, unit: "Pcs", discount: 0, price: 0, tax: false, total: 0 }])
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
            <div className="p-2 bg-indigo-500/10 rounded-lg">
              <FileText className="h-6 w-6 text-indigo-600" />
            </div>
            Tambah Tagihan Pembelian
          </h1>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button variant="outline" className="w-full sm:w-auto bg-card text-foreground border-border" onClick={() => router.back()}>Batal</Button>
          <Button variant="secondary" className="w-full sm:w-auto gap-2 bg-muted text-foreground border border-border">
            <Save className="h-4 w-4" /> Simpan Draft
          </Button>
          <Button className="w-full sm:w-auto gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
            <ShoppingCart className="h-4 w-4" /> Simpan & Proses
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left Column (Main Form) */}
        <div className="xl:col-span-2 space-y-6">
          
          {/* Section 1: Vendor & Document Info */}
          <Card className="border-0 shadow-sm ring-1 ring-border bg-card">
            <CardHeader className="bg-muted/30 rounded-t-xl pb-4 border-b border-border">
              <CardTitle className="text-lg flex items-center gap-2 text-foreground">
                <UserCircle className="h-5 w-5 text-muted-foreground" />
                Informasi Vendor
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="space-y-2">
                  <Label htmlFor="vendor" className="text-foreground">Vendor <span className="text-rose-500">*</span></Label>
                  <Select>
                    <SelectTrigger id="vendor" className="bg-muted border-border">
                      <SelectValue placeholder="Pilih kontak..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="v1">PT Surya Kayu</SelectItem>
                      <SelectItem value="v2">CV Logam Abadi</SelectItem>
                      <SelectItem value="v3">Toko Elektronik Jaya</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="invoiceNo" className="text-foreground">Nomor</Label>
                  <Input id="invoiceNo" defaultValue="PI/00001" className="bg-muted border-border font-medium" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-border">
                <div className="space-y-2">
                  <Label htmlFor="txDate" className="text-foreground">Tgl. Transaksi <span className="text-rose-500">*</span></Label>
                  <Input id="txDate" type="date" defaultValue="2026-10-10" className="bg-muted border-border" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dueDate" className="text-foreground">Tgl. Jatuh Tempo</Label>
                  <Input id="dueDate" type="date" defaultValue="2026-11-09" className="bg-muted border-border" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="term" className="text-foreground">Termin</Label>
                  <Select defaultValue="net30">
                    <SelectTrigger id="term" className="bg-muted border-border">
                      <SelectValue placeholder="Pilih termin..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="net15">Net 15</SelectItem>
                      <SelectItem value="net30">Net 30</SelectItem>
                      <SelectItem value="net60">Net 60</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="warehouse" className="text-foreground flex items-center justify-between">
                    <span>Gudang <span className="text-rose-500">*</span></span>
                    <span className="text-[10px] text-muted-foreground">Gudang Peritem</span>
                  </Label>
                  <Select defaultValue="unassigned">
                    <SelectTrigger id="warehouse" className="bg-muted border-border">
                      <SelectValue placeholder="Pilih gudang..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      <SelectItem value="w1">Gudang Utama</SelectItem>
                      <SelectItem value="w2">Gudang Cabang</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reference" className="text-foreground">Referensi</Label>
                  <Input id="reference" placeholder="Referensi" className="bg-muted border-border" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tags" className="text-foreground">Tag</Label>
                  <Select>
                    <SelectTrigger id="tags" className="bg-muted border-border">
                      <SelectValue placeholder="Pilih Tag" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="t1">Bahan Baku</SelectItem>
                      <SelectItem value="t2">Operasional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

            </CardContent>
          </Card>

          {/* Section 2: Items Table */}
          <Card className="border-0 shadow-sm ring-1 ring-border overflow-hidden bg-card">
            <CardHeader className="bg-muted/30 pb-4 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
              <CardTitle className="text-lg text-foreground">Detail Produk</CardTitle>
              <div className="flex items-center gap-4">
                <Input placeholder="Scan Barcode/SKU" className="bg-card border-border h-8 w-48 text-sm" />
                <span className="text-xs text-muted-foreground whitespace-nowrap">Harga termasuk pajak</span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/50 border-y border-border">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[20%] text-foreground">Produk</TableHead>
                      <TableHead className="w-[20%] text-foreground">Deskripsi</TableHead>
                      <TableHead className="w-[10%] text-center text-foreground">Kuantitas</TableHead>
                      <TableHead className="w-[10%] text-center text-foreground">Satuan</TableHead>
                      <TableHead className="w-[10%] text-right text-foreground">Discount</TableHead>
                      <TableHead className="w-[15%] text-right text-foreground">Harga</TableHead>
                      <TableHead className="w-[15%] text-right text-foreground">Jumlah</TableHead>
                      <TableHead className="w-12"></TableHead>
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
                              <SelectItem value="p1">Kayu Jati Merah</SelectItem>
                              <SelectItem value="p2">Besi Beton 10mm</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="align-top pt-4">
                          <Input placeholder="Keterangan" className="bg-card border-border" />
                        </TableCell>
                        <TableCell className="align-top pt-4">
                          <Input type="number" min="1" defaultValue={1} className="bg-card border-border text-center" />
                        </TableCell>
                        <TableCell className="align-top pt-4">
                          <Select defaultValue="pcs">
                            <SelectTrigger className="bg-card border-border">
                              <SelectValue placeholder="Satuan" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pcs">Pcs</SelectItem>
                              <SelectItem value="kg">Kg</SelectItem>
                              <SelectItem value="m3">M³</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="align-top pt-4">
                          <Input type="text" placeholder="0%" className="bg-card border-border text-right" />
                        </TableCell>
                        <TableCell className="align-top pt-4">
                          <Input type="number" placeholder="0" className="bg-card border-border text-right" />
                        </TableCell>
                        <TableCell className="align-top pt-4">
                          <div className="h-10 flex items-center justify-end font-medium text-foreground">0</div>
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
                <Button variant="outline" onClick={addRow} className="gap-2 bg-card text-indigo-600 border-border hover:bg-indigo-500/10 hover:border-indigo-500/30">
                  <Plus className="h-4 w-4" /> Tambah baris
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Notes & Attachments */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-0 shadow-sm ring-1 ring-border bg-card">
              <CardHeader className="bg-muted/30 rounded-t-xl pb-3 border-b border-border">
                <CardTitle className="text-base text-foreground">Pesan & Ketentuan</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div>
                  <Label className="text-muted-foreground text-xs mb-1 block">Pesan untuk Vendor</Label>
                  <Textarea placeholder="Tuliskan pesan..." className="resize-none h-24 bg-muted border-border" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm ring-1 ring-border h-full bg-card">
              <CardHeader className="bg-muted/30 rounded-t-xl pb-3 border-b border-border">
                <CardTitle className="text-base flex items-center gap-2 text-foreground">
                  <Paperclip className="h-4 w-4 text-muted-foreground" /> 
                  Attachment
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 h-[calc(100%-3rem)] flex flex-col">
                <div className="flex-1 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center p-6 text-center hover:bg-muted/50 hover:border-indigo-500/50 transition-colors cursor-pointer">
                  <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-full mb-3">
                    <Paperclip className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-medium text-foreground">Klik atau seret file ke area ini</p>
                  <p className="text-xs text-muted-foreground mt-1">File size maximal 10 MB</p>
                </div>
              </CardContent>
            </Card>
          </div>

        </div>

        {/* Right Column (Summary) */}
        <div className="xl:col-span-1">
          <Card className="border-0 shadow-sm ring-1 ring-border sticky top-6 bg-card">
            <CardHeader className="bg-muted/30 rounded-t-xl pb-4 border-b border-border">
              <CardTitle className="text-lg text-foreground">Ringkasan Tagihan</CardTitle>
              <CardDescription className="text-muted-foreground">Rincian nilai transaksi pembelian</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Sub Total</span>
                <span className="font-medium text-foreground">0</span>
              </div>
              
              <div className="flex justify-between items-center text-sm">
                <span className="text-indigo-600 font-medium cursor-pointer hover:underline flex items-center"><Plus className="w-3 h-3 mr-1" /> Tambahan Diskon</span>
              </div>
              
              <div className="flex justify-between items-center text-sm">
                <span className="text-indigo-600 font-medium cursor-pointer hover:underline flex items-center"><Plus className="w-3 h-3 mr-1" /> Biaya pengiriman</span>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="text-indigo-600 font-medium cursor-pointer hover:underline flex items-center"><Plus className="w-3 h-3 mr-1" /> Biaya Transaksi</span>
              </div>

              <div className="pt-2 mt-2 border-t border-border">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-foreground">Total</span>
                  <span className="text-base font-bold text-foreground">0</span>
                </div>
              </div>

              <div className="flex justify-between items-center text-sm pt-2">
                <span className="text-indigo-600 font-medium cursor-pointer hover:underline flex items-center"><Plus className="w-3 h-3 mr-1" /> Pemotongan</span>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="text-indigo-600 font-medium cursor-pointer hover:underline flex items-center"><Plus className="w-3 h-3 mr-1" /> Uang muka</span>
              </div>

              <div className="pt-4 mt-4 border-t border-dashed border-border">
                <div className="flex justify-between items-center">
                  <span className="text-base font-semibold text-foreground">Sisa Tagihan</span>
                  <span className="text-2xl font-bold text-indigo-600">0</span>
                </div>
              </div>

              <div className="pt-6">
                <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg transition-all py-6 text-base font-semibold">
                  Simpan Tagihan Pembelian
                </Button>
              </div>

            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  )
}
