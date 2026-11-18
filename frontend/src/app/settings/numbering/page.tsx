"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Hash, CheckCircle2, Save, FileText, Eye } from "lucide-react"

export default function SettingsNumbering() {
  const [saved, setSaved] = useState(false)
  const [formats, setFormats] = useState({
    soPrefix: "SO-YYYY-",
    soDigits: "4",
    poPrefix: "PO-YYYY-",
    poDigits: "4",
    invPrefix: "INV-YYYY-",
    invDigits: "4",
    doPrefix: "DO-YYYY-",
    doDigits: "4",
    rfqPrefix: "RFQ-YYYY-",
    rfqDigits: "4",
  })

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("tatalora_numbering_formats")
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          setFormats(prev => ({ ...prev, ...parsed }))
        } catch (e) {
          console.error(e)
        }
      }
    }
  }, [])

  const year = new Date().getFullYear()

  const generatePreview = (prefix: string, digits: string) => {
    const p = prefix.replace("YYYY", String(year)).replace("YY", String(year).slice(-2))
    const d = parseInt(digits, 10) || 4
    return `${p}${"1".padStart(d, "0")}`
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (typeof window !== "undefined") {
      localStorage.setItem("tatalora_numbering_formats", JSON.stringify(formats))
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Hash className="w-7 h-7 text-primary" />
            Format Penomoran Dokumen (Auto-Numbering)
          </h1>
          <p className="text-muted-foreground text-sm">
            Atur skema penomoran otomatis untuk Faktur, Pesanan Penjualan, Surat Jalan, dan Pembelian.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <Card className="border shadow-xs">
          <CardHeader className="border-b bg-muted/20">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Skema Penomoran Dokumen Transaksi
            </CardTitle>
            <CardDescription>
              Gunakan placeholder seperti <code>YYYY</code> (tahun 4 digit) atau <code>MM</code> (bulan) dalam prefix penomoran.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            
            {/* Sales Order */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center p-3 rounded-lg border bg-muted/10">
              <div>
                <Label className="font-semibold text-foreground">Sales Order (SO)</Label>
                <p className="text-xs text-muted-foreground">Pesanan Penjualan Pelanggan</p>
              </div>
              <div className="flex gap-2">
                <Input 
                  value={formats.soPrefix} 
                  onChange={e => setFormats({ ...formats, soPrefix: e.target.value })} 
                  placeholder="SO-YYYY-" 
                />
                <Input 
                  value={formats.soDigits} 
                  onChange={e => setFormats({ ...formats, soDigits: e.target.value })} 
                  className="w-16 text-center" 
                  placeholder="4" 
                />
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1.5 font-mono bg-background p-2 rounded border">
                <Eye className="w-3.5 h-3.5 text-primary" />
                <span>Pratinjau: <strong>{generatePreview(formats.soPrefix, formats.soDigits)}</strong></span>
              </div>
            </div>

            {/* Sales Invoice */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center p-3 rounded-lg border bg-muted/10">
              <div>
                <Label className="font-semibold text-foreground">Faktur Penjualan (Invoice)</Label>
                <p className="text-xs text-muted-foreground">Faktur Penagihan Piutang (AR)</p>
              </div>
              <div className="flex gap-2">
                <Input 
                  value={formats.invPrefix} 
                  onChange={e => setFormats({ ...formats, invPrefix: e.target.value })} 
                  placeholder="INV-YYYY-" 
                />
                <Input 
                  value={formats.invDigits} 
                  onChange={e => setFormats({ ...formats, invDigits: e.target.value })} 
                  className="w-16 text-center" 
                  placeholder="4" 
                />
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1.5 font-mono bg-background p-2 rounded border">
                <Eye className="w-3.5 h-3.5 text-primary" />
                <span>Pratinjau: <strong>{generatePreview(formats.invPrefix, formats.invDigits)}</strong></span>
              </div>
            </div>

            {/* Delivery Order */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center p-3 rounded-lg border bg-muted/10">
              <div>
                <Label className="font-semibold text-foreground">Surat Jalan (Delivery Order)</Label>
                <p className="text-xs text-muted-foreground">Pengiriman Barang Gudang</p>
              </div>
              <div className="flex gap-2">
                <Input 
                  value={formats.doPrefix} 
                  onChange={e => setFormats({ ...formats, doPrefix: e.target.value })} 
                  placeholder="DO-YYYY-" 
                />
                <Input 
                  value={formats.doDigits} 
                  onChange={e => setFormats({ ...formats, doDigits: e.target.value })} 
                  className="w-16 text-center" 
                  placeholder="4" 
                />
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1.5 font-mono bg-background p-2 rounded border">
                <Eye className="w-3.5 h-3.5 text-primary" />
                <span>Pratinjau: <strong>{generatePreview(formats.doPrefix, formats.doDigits)}</strong></span>
              </div>
            </div>

            {/* Purchase Order */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center p-3 rounded-lg border bg-muted/10">
              <div>
                <Label className="font-semibold text-foreground">Purchase Order (PO)</Label>
                <p className="text-xs text-muted-foreground">Pesanan Pembelian ke Supplier</p>
              </div>
              <div className="flex gap-2">
                <Input 
                  value={formats.poPrefix} 
                  onChange={e => setFormats({ ...formats, poPrefix: e.target.value })} 
                  placeholder="PO-YYYY-" 
                />
                <Input 
                  value={formats.poDigits} 
                  onChange={e => setFormats({ ...formats, poDigits: e.target.value })} 
                  className="w-16 text-center" 
                  placeholder="4" 
                />
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1.5 font-mono bg-background p-2 rounded border">
                <Eye className="w-3.5 h-3.5 text-primary" />
                <span>Pratinjau: <strong>{generatePreview(formats.poPrefix, formats.poDigits)}</strong></span>
              </div>
            </div>

          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 items-center">
          {saved && (
            <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Format penomoran berhasil disimpan!
            </span>
          )}
          <Button type="submit" className="bg-primary text-primary-foreground gap-2">
            <Save className="w-4 h-4" /> Simpan Format Penomoran
          </Button>
        </div>
      </form>
    </div>
  )
}
