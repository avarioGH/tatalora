"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Printer, QrCode, CheckCircle2, Save, ExternalLink } from "lucide-react"
import Link from "next/link"

export default function SettingsPrinter() {
  const [paperWidth, setPaperWidth] = useState("80mm")
  const [autoPrintReceipt, setAutoPrintReceipt] = useState(true)
  const [showLogo, setShowLogo] = useState(true)
  const [footerMessage, setFooterMessage] = useState("Terima kasih atas kunjungan Anda!")
  const [barcodeType, setBarcodeType] = useState("CODE128")
  const [saved, setSaved] = useState(false)

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Printer className="w-7 h-7 text-primary" />
            Pengaturan Printer Thermal & Barcode
          </h1>
          <p className="text-muted-foreground text-sm">
            Konfigurasi cetak struk kasir POS, ukuran kertas thermal, dan format label barcode produk.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <Card className="border shadow-xs">
          <CardHeader className="border-b bg-muted/20">
            <CardTitle className="text-base flex items-center gap-2">
              <Printer className="w-4 h-4 text-primary" />
              Printer Struk Kasir (POS Thermal Printer)
            </CardTitle>
            <CardDescription>
              Pengaturan cetak otomatis dan layout kertas struk kasir.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="font-semibold">Ukuran Kertas Thermal</Label>
                <select 
                  value={paperWidth} 
                  onChange={e => setPaperWidth(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="58mm">58mm (Thermal Mini POS)</option>
                  <option value="80mm">80mm (Thermal Standar Kasir)</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label className="font-semibold">Pesan Footer Struk</Label>
                <Input 
                  value={footerMessage} 
                  onChange={e => setFooterMessage(e.target.value)} 
                  placeholder="Terima kasih..."
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/20">
              <div className="space-y-0.5">
                <Label className="font-semibold">Cetak Struk Otomatis Setelah Pembayaran</Label>
                <p className="text-xs text-muted-foreground">Dialog cetak browser langsung muncul setelah kasir menekan tombol Bayar.</p>
              </div>
              <Switch checked={autoPrintReceipt} onCheckedChange={setAutoPrintReceipt} />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/20">
              <div className="space-y-0.5">
                <Label className="font-semibold">Tampilkan Logo Perusahaan di Header Struk</Label>
                <p className="text-xs text-muted-foreground">Mencetak logo toko pada bagian paling atas kertas struk.</p>
              </div>
              <Switch checked={showLogo} onCheckedChange={setShowLogo} />
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-xs">
          <CardHeader className="border-b bg-muted/20">
            <CardTitle className="text-base flex items-center gap-2">
              <QrCode className="w-4 h-4 text-primary" />
              Format Label Barcode Produk
            </CardTitle>
            <CardDescription>
              Format barcode standar untuk cetak stiker rak dan label harga barang.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2 max-w-sm">
              <Label className="font-semibold">Simbol Barcode Standar</Label>
              <select 
                value={barcodeType} 
                onChange={e => setBarcodeType(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="CODE128">Code 128 (Alfanumerik - Rekomendasi)</option>
                <option value="EAN13">EAN-13 (13 Digit Standar Ritel)</option>
                <option value="QR">QR Code 2D</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between items-center">
          <Link href="/pos/new-transaction" className="text-xs text-primary hover:underline flex items-center gap-1">
            Buka Kasir POS untuk uji coba cetak struk →
          </Link>
          <div className="flex items-center gap-3">
            {saved && (
              <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Pengaturan printer berhasil disimpan!
              </span>
            )}
            <Button type="submit" className="bg-primary text-primary-foreground gap-2">
              <Save className="w-4 h-4" /> Simpan Pengaturan
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
