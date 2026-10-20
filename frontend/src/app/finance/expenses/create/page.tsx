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
import { Switch } from "@/components/ui/switch"
import { 
  Plus, Trash2, ArrowLeft, Save, Paperclip, FileText, UserCircle, Wallet, Bold, Italic, Underline, List, Type
} from "lucide-react"

export default function CreateExpensePage() {
  const router = useRouter()
  const [items, setItems] = useState([
    { id: 1, account: "", desc: "", tax: "", total: 0 }
  ])

  const addRow = () => {
    setItems([...items, { id: Date.now(), account: "", desc: "", tax: "", total: 0 }])
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
            <div className="p-2 bg-violet-500/10 rounded-lg">
              <Wallet className="h-6 w-6 text-violet-600" />
            </div>
            Tambah Biaya
          </h1>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button variant="outline" className="w-full sm:w-auto bg-card text-foreground border-border" onClick={() => router.back()}>Batal</Button>
          <Button variant="outline" className="w-full sm:w-auto bg-card text-foreground border-border">
            Panduan <ChevronDownIcon className="w-3 h-3 ml-2" />
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
                <FileText className="h-5 w-5 text-muted-foreground" />
                Informasi Transaksi
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                <div className="space-y-2">
                  <Label htmlFor="account" className="text-foreground">Dibayar Dari <span className="text-rose-500">*</span></Label>
                  <Select defaultValue="kas">
                    <SelectTrigger id="account" className="bg-muted border-border">
                      <SelectValue placeholder="Pilih akun..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kas">1-10001 Kas</SelectItem>
                      <SelectItem value="bank">1-10002 Bank BCA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center space-x-2 h-10">
                  <Switch id="bayar-nanti" />
                  <Label htmlFor="bayar-nanti" className="cursor-pointer text-foreground">Bayar Nanti</Label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="payee" className="text-foreground">Penerima <span className="text-rose-500">*</span></Label>
                  <Select>
                    <SelectTrigger id="payee" className="bg-muted border-border">
                      <SelectValue placeholder="Pilih penerima..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="v1">PLN</SelectItem>
                      <SelectItem value="v2">Telkom</SelectItem>
                      <SelectItem value="v3">Rental Jaya</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="txDate" className="text-foreground">Tgl. Transaksi <span className="text-rose-500">*</span></Label>
                  <Input id="txDate" type="date" defaultValue="2026-10-10" className="bg-muted border-border" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-border">
                <div className="space-y-2">
                  <Label htmlFor="invoiceNo" className="text-foreground text-xs">Nomor</Label>
                  <Input id="invoiceNo" defaultValue="EXP/00001" className="bg-muted border-border font-medium" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reference" className="text-foreground text-xs">Referensi</Label>
                  <Input id="reference" placeholder="Referensi" className="bg-muted border-border" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tags" className="text-foreground text-xs">Tag</Label>
                  <Select>
                    <SelectTrigger id="tags" className="bg-muted border-border">
                      <SelectValue placeholder="Pilih Tag" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="t1">Operasional</SelectItem>
                      <SelectItem value="t2">Bulanan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

            </CardContent>
          </Card>

          {/* Section 2: Items Table */}
          <Card className="border-0 shadow-sm ring-1 ring-border overflow-hidden bg-card">
            <CardHeader className="bg-muted/30 pb-4 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
              <CardTitle className="text-lg text-foreground">Detail Akun Biaya</CardTitle>
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
                      <TableHead className="w-[30%] text-foreground font-semibold">Akun Biaya</TableHead>
                      <TableHead className="w-[30%] text-foreground font-semibold">Deskripsi</TableHead>
                      <TableHead className="w-[15%] text-foreground font-semibold">Pajak</TableHead>
                      <TableHead className="w-[20%] text-right text-foreground font-semibold">Total</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, index) => (
                      <TableRow key={item.id} className="group border-border hover:bg-muted/20">
                        <TableCell className="align-top pt-4">
                          <Select>
                            <SelectTrigger className="bg-card border-border">
                              <SelectValue placeholder="Pilih akun" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="a1">6-60001 Biaya Listrik</SelectItem>
                              <SelectItem value="a2">6-60002 Biaya Air</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="align-top pt-4">
                          <Input placeholder="Keterangan..." className="bg-card border-border" />
                        </TableCell>
                        <TableCell className="align-top pt-4">
                          <Select>
                            <SelectTrigger className="bg-card border-border">
                              <SelectValue placeholder="-" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">-</SelectItem>
                              <SelectItem value="ppn">PPN 11%</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="align-top pt-4">
                          <Input type="number" placeholder="0" className="bg-card border-border text-right font-medium" />
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
                <Button variant="outline" onClick={addRow} className="gap-2 bg-card text-violet-600 border-border hover:bg-violet-500/10 hover:border-violet-500/30 w-full sm:w-auto justify-center">
                  <Plus className="h-4 w-4" /> Tambah baris
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Notes & Attachments */}
          <div className="space-y-4">
            
            {/* Rich Text Editor Mockup */}
            <Card className="border-0 shadow-sm ring-1 ring-border bg-card overflow-hidden">
              <div className="px-4 py-3 bg-muted/30 border-b border-border flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors">
                <span className="text-sm font-medium text-foreground flex items-center gap-2">
                  <ChevronDownIcon className="w-4 h-4 text-muted-foreground" />
                  Pesan
                </span>
              </div>
              <CardContent className="p-4 space-y-4">
                <div className="border border-border rounded-md overflow-hidden bg-background">
                  <div className="flex items-center gap-1 border-b border-border bg-muted/50 p-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground"><Bold className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground"><Italic className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground"><Underline className="w-4 h-4" /></Button>
                    <div className="w-px h-4 bg-border mx-1"></div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground"><List className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground"><Type className="w-4 h-4" /></Button>
                  </div>
                  <Textarea placeholder="Pesan..." className="resize-none h-32 border-0 focus-visible:ring-0 rounded-none bg-background text-foreground" />
                </div>
              </CardContent>
            </Card>

            {/* Attachment Area */}
            <Card className="border-0 shadow-sm ring-1 ring-border h-full bg-card overflow-hidden">
              <div className="px-4 py-3 bg-muted/30 border-b border-border flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors">
                <span className="text-sm font-medium text-foreground flex items-center gap-2">
                  <ChevronDownIcon className="w-4 h-4 text-muted-foreground" />
                  Attachment
                </span>
              </div>
              <CardContent className="p-4">
                <div className="w-full border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center p-8 text-center hover:bg-muted/50 hover:border-violet-500/50 transition-colors cursor-pointer bg-background">
                  <div className="p-3 bg-violet-500/10 text-violet-500 rounded-full mb-3">
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
              <CardTitle className="text-lg text-foreground">Ringkasan Biaya</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Sub Total</span>
                <span className="font-medium text-foreground">0</span>
              </div>
              
              <div className="pt-2 mt-2 border-t border-border">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-foreground">Total</span>
                  <span className="text-base font-bold text-foreground">0</span>
                </div>
              </div>

              <div className="flex justify-between items-center text-sm pt-2">
                <span className="text-violet-600 font-medium cursor-pointer hover:underline flex items-center"><Plus className="w-3 h-3 mr-1" /> Pemotongan</span>
              </div>

              <div className="pt-6">
                <Button className="w-full bg-violet-600 hover:bg-violet-700 text-white shadow-md hover:shadow-lg transition-all py-6 text-base font-semibold gap-2">
                  <Save className="w-4 h-4" />
                  Simpan Biaya
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
