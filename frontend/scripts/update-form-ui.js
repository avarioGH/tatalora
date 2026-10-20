const fs = require('fs');

const path = 'src/app/inventory/products/page.tsx';
let content = fs.readFileSync(path, 'utf8');

const importReplacement = `
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { BarChart3, PackageOpen, PackageX, FileText, Settings, CreditCard, ChevronRight, Check } from "lucide-react"
import { Switch } from "@/components/ui/switch"
`;

// Only add if Switch doesn't exist
if (!content.includes('import { Switch }')) {
    content = content.replace('import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"', importReplacement);
}

const newFormBlock = `
  {showForm && (
    <Card className="shadow-sm border-border bg-card animate-in slide-in-from-top-4 duration-300">
      <form onSubmit={handleSave}>
        <CardHeader className="border-b border-border/50 pb-4 flex flex-row justify-between items-center bg-muted/10">
          <CardTitle className="text-xl">Tambah Produk</CardTitle>
          <Button variant="outline" size="sm" type="button" className="bg-background gap-2"><HelpCircle className="w-4 h-4"/> Panduan</Button>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          
          <Button type="button" variant="outline" className="w-full justify-start text-muted-foreground border-dashed bg-muted/20">
            <ChevronRight className="w-4 h-4 mr-2" /> Tampilkan Gambar Produk
          </Button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-xs font-semibold flex gap-1">Nama Produk <span className="text-rose-500">*</span></Label>
              <Input placeholder="Nama Produk" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required className="bg-background"/>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold flex items-center gap-1">Kode/SKU <HelpCircle className="w-3 h-3 text-muted-foreground" /></Label>
              <div className="flex gap-2">
                <Input placeholder="SKU/00004" value={formData.code} onChange={(e) => setFormData({...formData, code: e.target.value})} className="bg-background"/>
                <Button type="button" variant="outline" onClick={generateSKU}>Generate</Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-xs font-semibold flex gap-1">Kategori <span className="text-rose-500">*</span></Label>
              <Select value={formData.categoryId} onValueChange={(val) => setFormData({...formData, categoryId: val || ""})}>
                <SelectTrigger className="w-full bg-background"><SelectValue placeholder="Pilih Kategori" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c: any, idx: number) => <SelectItem key={c?.id || idx} value={c?.id || \`cat-\${idx}\`}>{c?.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Kategori Tambahan</Label>
              <Select>
                <SelectTrigger className="w-full bg-background"><SelectValue placeholder="Pilih kategori tambahan" /></SelectTrigger>
                <SelectContent><SelectItem value="none" disabled>Tidak ada</SelectItem></SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold flex gap-1">Satuan <span className="text-rose-500">*</span></Label>
            <Select defaultValue="pcs"><SelectTrigger className="w-full bg-background"><SelectValue placeholder="Pcs" /></SelectTrigger><SelectContent><SelectItem value="pcs">Pcs</SelectItem></SelectContent></Select>
          </div>

          <div className="grid grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Panjang</Label>
              <div className="relative"><Input type="number" placeholder="0" className="bg-background pr-10" /><span className="absolute right-3 top-2.5 text-xs text-muted-foreground">cm</span></div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Lebar</Label>
              <div className="relative"><Input type="number" placeholder="0" className="bg-background pr-10" /><span className="absolute right-3 top-2.5 text-xs text-muted-foreground">cm</span></div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Tinggi</Label>
              <div className="relative"><Input type="number" placeholder="0" className="bg-background pr-10" /><span className="absolute right-3 top-2.5 text-xs text-muted-foreground">cm</span></div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold">Deskripsi</Label>
            <Input placeholder="Deskripsi" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="bg-background" />
          </div>

          <Button type="button" variant="link" className="px-0 text-primary h-auto flex items-center text-sm font-medium">
            <Plus className="w-4 h-4 mr-1" /> Tampilkan pengaturan akun dan pajak
          </Button>

          <div className="space-y-4 pt-4 border-t border-border/50">
            <div className="flex items-center gap-3">
              <Switch defaultChecked id="buy-item" />
              <Label htmlFor="buy-item" className="font-semibold cursor-pointer">Saya membeli item ini</Label>
            </div>
            <div className="pl-14 space-y-2 max-w-xl">
              <Label className="text-xs font-semibold">Harga</Label>
              <Input type="number" placeholder="0" value={formData.purchasePrice} onChange={(e) => setFormData({...formData, purchasePrice: e.target.value})} className="bg-background" />
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-border/50">
            <div className="flex items-center gap-3">
              <Switch defaultChecked id="sell-item" />
              <Label htmlFor="sell-item" className="font-semibold cursor-pointer">Saya menjual item ini</Label>
            </div>
            <div className="pl-14 flex gap-4 max-w-xl items-end">
              <div className="space-y-2 flex-1">
                <Label className="text-xs font-semibold">Harga</Label>
                <Input type="number" placeholder="0" value={formData.sellingPrice} onChange={(e) => setFormData({...formData, sellingPrice: e.target.value})} required className="bg-background" />
              </div>
              <Button type="button" variant="link" className="text-primary px-0 mb-1"><Plus className="w-4 h-4 mr-1"/> Tampilkan Harga Grosir</Button>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-border/50">
            <div className="flex items-center gap-3">
              <Switch defaultChecked id="track-item" />
              <Label htmlFor="track-item" className="font-semibold cursor-pointer">Saya melacak inventori item ini</Label>
            </div>
            <div className="pl-14 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold flex gap-1">Stok minimal <span className="text-rose-500">*</span></Label>
                <div className="flex items-center gap-2 mb-2">
                  <input type="radio" checked readOnly className="w-4 h-4 text-primary" />
                  <span className="text-sm">Sesuai pengaturan alur bisnis</span>
                </div>
                <div className="flex items-center gap-2">
                  <input type="radio" readOnly className="w-4 h-4" />
                  <Input className="w-24 bg-background h-8" disabled />
                </div>
              </div>
              
              <div className="space-y-3 pt-4">
                <h4 className="font-semibold text-sm">Stok Awal</h4>
                <div className="flex items-center gap-3">
                  <Switch defaultChecked id="init-stock" />
                  <Label htmlFor="init-stock" className="text-sm cursor-pointer">Jika produk ini mempunyai stok awal</Label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Gudang</Label>
                    <Select><SelectTrigger className="bg-background"><SelectValue placeholder="Pilih gudang" /></SelectTrigger><SelectContent><SelectItem value="none" disabled>Pilih gudang</SelectItem></SelectContent></Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Tanggal</Label>
                    <Input type="date" className="bg-background" defaultValue={new Date().toISOString().split('T')[0]} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Akun</Label>
                    <Select defaultValue="80100"><SelectTrigger className="bg-background"><SelectValue placeholder="8-80100 Penyesuaian Persediaan" /></SelectTrigger><SelectContent><SelectItem value="80100">8-80100 Penyesuaian Persediaan</SelectItem></SelectContent></Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Kuantitas</Label>
                    <Input type="number" placeholder="0" className="bg-background" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Harga Rata-rata</Label>
                    <Input type="number" placeholder="0" className="bg-background" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-indigo-50/50 dark:bg-slate-900/50 p-6 rounded-lg border border-indigo-100 dark:border-slate-800 flex flex-col items-center justify-center text-center mt-6">
            <div className="flex items-center gap-3 w-full justify-start mb-4">
              <Switch disabled id="serial-num" />
              <Label htmlFor="serial-num" className="text-muted-foreground">Produk ini mempunyai nomor seri / nomor produksi</Label>
            </div>
            <div className="bg-background border border-border p-6 rounded-lg shadow-sm max-w-sm w-full">
              <p className="font-semibold text-sm mb-4">Fitur Nomor Seri / Produksi tersedia di paket Champion</p>
              <Button type="button" className="bg-emerald-500 hover:bg-emerald-600 text-white w-full"><Check className="w-4 h-4 mr-2"/> Upgrade Sekarang</Button>
            </div>
          </div>

          <div className="space-y-2 pt-6">
            <Label className="font-semibold flex items-center gap-1"><LayoutGrid className="w-4 h-4" /> Ekstra <HelpCircle className="w-3 h-3 text-muted-foreground" /></Label>
            <Select><SelectTrigger className="bg-background"><SelectValue placeholder="Pilih grup ekstra" /></SelectTrigger><SelectContent><SelectItem value="none" disabled>Pilih grup ekstra</SelectItem></SelectContent></Select>
            <p className="text-xs text-muted-foreground mt-1">Pilih grup ekstra yang akan ditawarkan saat produk ini dipesan.</p>
          </div>
          
          <div className="flex justify-end gap-3 pt-6 mt-4 border-t border-border/50">
            <Button type="submit" className="min-w-[140px] bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm" disabled={isSubmitting}>
              {isSubmitting ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>

        </CardContent>
      </form>
    </Card>
  )}
`;

const origFormBlockRegex = /\{showForm && \(\s*<Card className="border-t-4 border-t-indigo-600 shadow-lg animate-in slide-in-from-top-4 duration-300">.*?<\/Card>\s*\)\s*\}/s;

content = content.replace(origFormBlockRegex, newFormBlock);

fs.writeFileSync(path, content, 'utf8');
