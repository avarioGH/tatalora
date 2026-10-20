const fs = require('fs');

const path = 'src/app/inventory/products/page.tsx';
let content = fs.readFileSync(path, 'utf8');

const importReplacement = `
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { BarChart3, PackageOpen, PackageX, FileText, Settings, CreditCard } from "lucide-react"
`;

content = content.replace('import { InventoryAPI } from "@/lib/api"', importReplacement + '\nimport { InventoryAPI } from "@/lib/api"');

const calculations = `
  const totalTersedia = filteredProducts.filter(p => { const s = warehouses.reduce((sum, wh) => sum + (p.stockMap[wh.id] || 0), 0); return s > 10; }).length;
  const totalHampirHabis = filteredProducts.filter(p => { const s = warehouses.reduce((sum, wh) => sum + (p.stockMap[wh.id] || 0), 0); return s > 0 && s <= 10; }).length;
  const totalHabis = filteredProducts.filter(p => { const s = warehouses.reduce((sum, wh) => sum + (p.stockMap[wh.id] || 0), 0); return s === 0; }).length;
  const totalStok = filteredProducts.reduce((sum, p) => sum + warehouses.reduce((s, wh) => s + (p.stockMap[wh.id] || 0), 0), 0);
  const totalNilai = filteredProducts.reduce((sum, p) => sum + (p.price * warehouses.reduce((s, wh) => s + (p.stockMap[wh.id] || 0), 0)), 0);
  const totalHPP = filteredProducts.reduce((sum, p) => sum + (Number(p.purchase_price || 0) * warehouses.reduce((s, wh) => s + (p.stockMap[wh.id] || 0), 0)), 0);

  return (
`;

content = content.replace('return (\n    <div className="space-y-6 animate-in fade-in duration-500 pb-10">', calculations + '\n    <div className="space-y-6 animate-in fade-in duration-500 pb-10">');


const topHeader = `
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-4 rounded-xl shadow-sm border border-border/50">
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          Produk
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="bg-background">Laporan</Button>
          <Button variant="outline" size="sm" className="bg-background">Panduan</Button>
          <Button variant="outline" size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white border-transparent">Aturan Harga</Button>
          <Button size="sm" onClick={() => { setShowForm(!showForm); if (!showForm) { setEditingId(null); setFormData({code: "", barcode: "", name: "", description: "", purchasePrice: "", sellingPrice: "", weight: "", categoryId: ""}); } }} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20">
            <Plus className="w-4 h-4 mr-1" /> {showForm ? "Batal" : "Tambah"}
          </Button>
          <Button variant="outline" size="sm" className="bg-background">Import</Button>
          <Button variant="outline" size="sm" className="bg-background">Print</Button>
          <Button variant="outline" size="icon" className="w-8 h-8 bg-background"><MoreHorizontal className="w-4 h-4" /></Button>
        </div>
      </div>

      <ScrollArea className="w-full whitespace-nowrap pb-4 -mt-2">
        <div className="flex w-max gap-4 p-1">
          <Card className="w-[200px] shadow-sm border-l-4 border-l-emerald-500">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-medium mb-2">Produk Stok Tersedia</p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600"><PackageOpen className="w-4 h-4" /></div>
                <span className="text-2xl font-bold">{totalTersedia}</span>
              </div>
            </CardContent>
          </Card>
          <Card className="w-[200px] shadow-sm border-l-4 border-l-amber-500">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-medium mb-2">Produk Stok Hampir Habis</p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600"><AlertTriangle className="w-4 h-4" /></div>
                <span className="text-2xl font-bold">{totalHampirHabis}</span>
              </div>
            </CardContent>
          </Card>
          <Card className="w-[200px] shadow-sm border-l-4 border-l-rose-500">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-medium mb-2">Produk Stok Habis</p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-600"><PackageX className="w-4 h-4" /></div>
                <span className="text-2xl font-bold">{totalHabis}</span>
              </div>
            </CardContent>
          </Card>
          <Card className="w-[200px] shadow-sm border-l-4 border-l-orange-500">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-medium mb-2">Total Stok</p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600"><Box className="w-4 h-4" /></div>
                <span className="text-2xl font-bold">{totalStok}</span>
              </div>
            </CardContent>
          </Card>
          <Card className="w-[220px] shadow-sm border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-medium mb-2">Total Nilai Produk</p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600"><CreditCard className="w-4 h-4" /></div>
                <span className="text-xl font-bold">{formatIDR(totalNilai)}</span>
              </div>
            </CardContent>
          </Card>
          <Card className="w-[220px] shadow-sm border-l-4 border-l-pink-500">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-medium mb-2">Total HPP</p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-pink-600"><FileText className="w-4 h-4" /></div>
                <span className="text-xl font-bold">{formatIDR(totalHPP)}</span>
              </div>
            </CardContent>
          </Card>
          <Card className="w-[200px] shadow-sm border-l-4 border-l-purple-500">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-medium mb-2">Total Penjualan</p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600"><BarChart3 className="w-4 h-4" /></div>
                <span className="text-2xl font-bold">0</span>
              </div>
            </CardContent>
          </Card>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
      <div className="flex justify-center -mt-6 pb-2">
        <Button variant="ghost" size="sm" className="text-xs text-indigo-600">Lihat Selengkapnya <ChevronDown className="w-3 h-3 ml-1" /></Button>
      </div>

`;

const origTopHeaderRegex = /<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">.*?<\/div>\s*<\/div>/s;
content = content.replace(origTopHeaderRegex, topHeader);


const tableBlock = `
      <Card className="border-border shadow-sm overflow-hidden mt-4">
        <div className="p-4 border-b border-border/60 flex flex-col sm:flex-row gap-4 justify-between bg-card">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" className="bg-background gap-2"><LayoutGrid className="w-4 h-4"/> Filter</Button>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <LayoutGrid className="w-4 h-4" /> Tampilkan stok per gudang
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="bg-background gap-2"><Edit2 className="w-4 h-4"/> Ubah Massal</Button>
            <div className="relative w-full sm:w-[250px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Cari nama atau SKU..." 
                className="pl-9 bg-background border-border h-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {isError && (
          <div className="m-4 p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-500 mt-0.5" />
            <div>
              <h4 className="font-semibold text-rose-700">Koneksi Database Terputus</h4>
              <p className="text-sm text-rose-600">Saat ini menampilkan data dummy karena server MongoDB tidak dapat dihubungi.</p>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <Table className="min-w-[1000px]">
            <TableHeader className="bg-muted/30">
              <TableRow className="border-border/60">
                <TableHead className="w-[50px] text-center"><input type="checkbox" className="rounded" /></TableHead>
                <TableHead className="font-semibold">Nama</TableHead>
                <TableHead className="font-semibold">Kode/SKU</TableHead>
                <TableHead className="font-semibold">Kategori</TableHead>
                <TableHead className="font-semibold">Satuan</TableHead>
                <TableHead className="text-right font-semibold">Harga Beli</TableHead>
                <TableHead className="text-right font-semibold">Harga Jual</TableHead>
                <TableHead className="text-center font-semibold">Qty</TableHead>
                <TableHead className="text-right font-semibold">HPP</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-32 text-center text-muted-foreground">Tidak ada produk yang ditemukan.</TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((p) => {
                  const totalStock = warehouses.reduce((sum, wh) => sum + (p.stockMap[wh.id] || 0), 0);
                  return (
                    <TableRow key={p.id} className="border-border/60 hover:bg-muted/20 transition-colors group">
                      <TableCell className="text-center"><input type="checkbox" className="rounded" /></TableCell>
                      <TableCell className="font-medium text-foreground">{p.name}</TableCell>
                      <TableCell className="text-muted-foreground flex items-center gap-2"><LayoutGrid className="w-3 h-3"/> {p.sku}</TableCell>
                      <TableCell>{p.category}</TableCell>
                      <TableCell>Pcs</TableCell>
                      <TableCell className="text-right">{formatIDR(Number(p.purchase_price || 0))}</TableCell>
                      <TableCell className="text-right">{formatIDR(p.price)}</TableCell>
                      <TableCell className="text-center font-semibold">{totalStock}</TableCell>
                      <TableCell className="text-right">{formatIDR(Number(p.purchase_price || 0))}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger className="h-8 w-8 p-0 inline-flex items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground outline-none">
                            <MoreHorizontal className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(p)} className="cursor-pointer"><Edit2 className="mr-2 h-4 w-4 text-indigo-500" /> Edit</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(p.id)} className="cursor-pointer text-rose-600 focus:bg-rose-50"><Trash2 className="mr-2 h-4 w-4" /> Hapus</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
              <TableRow className="bg-muted/10">
                <TableCell colSpan={7} className="font-bold text-foreground">Total</TableCell>
                <TableCell className="text-center font-bold text-foreground">{totalStok}</TableCell>
                <TableCell className="text-right font-bold text-foreground">{formatIDR(totalHPP)}</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        <div className="p-4 border-t border-border flex justify-end items-center gap-4 text-sm text-muted-foreground">
          <span>Total {filteredProducts.length} data</span>
          <select className="border border-border rounded px-2 py-1 bg-background"><option>15 / halaman</option></select>
        </div>
      </Card>
`;

const origTableBlockRegex = /<Card className="border-border shadow-sm overflow-hidden">.*?<\/Card>\s*<\/div>\s*\)\s*}/s;
content = content.replace(origTableBlockRegex, tableBlock + '\n    </div>\n  )\n}');

fs.writeFileSync(path, content, 'utf8');
