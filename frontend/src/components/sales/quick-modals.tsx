import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api, InventoryAPI } from '@/lib/api';
import { UserPlus, Box, Percent, Camera, Upload, X, Image as ImageIcon } from 'lucide-react';

export function QuickAddCustomerModal({
  open,
  onOpenChange,
  onSuccess,
  isSupplier = false
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (newCust: any) => void;
  isSupplier?: boolean;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert(isSupplier ? 'Nama supplier wajib diisi!' : 'Nama pelanggan wajib diisi!');

    setLoading(true);
    try {
      const res = await api.post('/customers', {
        name,
        phone,
        email,
        address,
        is_supplier: isSupplier,
        is_customer: !isSupplier
      });
      const created = res.data;
      onSuccess(created);
      onOpenChange(false);
      setName('');
      setPhone('');
      setEmail('');
      setAddress('');
    } catch (err: any) {
      console.error(err);
      alert('Gagal menambah data: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] bg-card border-border">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="pb-3 border-b border-border">
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
              <UserPlus className="w-5 h-5 text-indigo-600" /> {isSupplier ? 'Tambah Supplier Baru' : 'Tambah Pelanggan Baru'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nama {isSupplier ? 'Supplier' : 'Pelanggan'} / Perusahaan <span className="text-rose-500">*</span></Label>
              <Input 
                placeholder={isSupplier ? "Contoh: PT Kayu Abadi Jaya / Toko Bahan Budi" : "Contoh: PT Sumber Jaya Sentosa / Bpk. Budi"}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="bg-background"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Nomor Telepon / WA</Label>
                <Input 
                  placeholder="0812xxxxxxxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="bg-background"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Email</Label>
                <Input 
                  type="email"
                  placeholder="email@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-background"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Alamat</Label>
              <Textarea 
                placeholder="Alamat kantor / gudang supplier..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={3}
                className="bg-background resize-none text-xs"
              />
            </div>
          </div>
          <DialogFooter className="pt-3 border-t border-border flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {loading ? 'Menyimpan...' : (isSupplier ? 'Simpan Supplier' : 'Simpan Pelanggan')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function QuickAddProductModal({
  open,
  onOpenChange,
  onSuccess
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (newProd: any) => void;
}) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('0');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert('Nama produk wajib diisi!');

    setLoading(true);
    try {
      const sku = code.trim() || ('PRD-' + Math.floor(100000 + Math.random() * 900000));
      const payload = new FormData();
      payload.append('name', name);
      payload.append('code', sku);
      payload.append('barcode', sku);
      payload.append('sellingPrice', sellingPrice || '0');
      payload.append('purchasePrice', purchasePrice || '0');
      if (selectedFile) {
        payload.append('images', selectedFile);
      }

      const created = await InventoryAPI.createProduct(payload);
      onSuccess(created);
      onOpenChange(false);
      setName('');
      setCode('');
      setSellingPrice('');
      setPurchasePrice('0');
      setSelectedFile(null);
      setPreviewUrl(null);
    } catch (err: any) {
      console.error(err);
      alert('Gagal menambah produk: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] bg-card border-border">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="pb-3 border-b border-border">
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
              <Box className="w-5 h-5 text-indigo-600" /> Tambah Produk Baru
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[75vh] overflow-y-auto px-1">
            {/* Foto Produk */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Foto / Gambar Produk (Opsional)</Label>
              <div className="flex items-center gap-4">
                {previewUrl ? (
                  <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-border group bg-muted flex items-center justify-center">
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute top-1 right-1 bg-rose-600 text-white rounded-full p-1 opacity-90 hover:opacity-100"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-24 h-24 rounded-lg border-2 border-dashed border-border hover:border-primary/60 flex flex-col items-center justify-center cursor-pointer bg-muted/40 hover:bg-muted transition text-muted-foreground hover:text-foreground text-center p-2"
                  >
                    <Camera className="w-6 h-6 mb-1 text-muted-foreground" />
                    <span className="text-[10px] leading-tight">Ambil Foto / Upload</span>
                  </div>
                )}
                <div className="flex-1 space-y-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    className="text-xs h-8"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-3.5 h-3.5 mr-1.5" /> Pilih Foto / Buka Kamera
                  </Button>
                  <p className="text-[11px] text-muted-foreground">Format JPG, PNG, WEBP. Maks 5MB.</p>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nama Produk <span className="text-rose-500">*</span></Label>
              <Input 
                placeholder="Contoh: Baju Kemeja Polos / Balok Kayu Meranti"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="bg-background"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Kode / SKU (Opsional, otomatis bila kosong)</Label>
              <Input 
                placeholder="PRD-0001"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="bg-background"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Harga Beli / Pokok / HPP (Rp)</Label>
                <Input 
                  type="number"
                  placeholder="0"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  className="bg-background"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Harga Jual (Rp)</Label>
                <Input 
                  type="number"
                  placeholder="0"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  className="bg-background"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="pt-3 border-t border-border flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {loading ? 'Menyimpan...' : 'Simpan Produk'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function QuickAddTaxModal({
  open,
  onOpenChange,
  onSuccess
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (newTax: { id: string; name: string; rate: number }) => void;
}) {
  const [taxName, setTaxName] = useState('');
  const [taxRate, setTaxRate] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taxName.trim()) return alert('Nama pajak wajib diisi!');
    const rate = parseFloat(taxRate) || 0;
    const newTax = {
      id: 'tax-' + Date.now(),
      name: taxName.trim(),
      rate: rate
    };
    onSuccess(newTax);
    onOpenChange(false);
    setTaxName('');
    setTaxRate('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] bg-card border-border">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="pb-3 border-b border-border">
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
              <Percent className="w-5 h-5 text-indigo-600" /> Tambah Tarif Pajak
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nama Pajak</Label>
              <Input 
                placeholder="Contoh: PPN 11%"
                value={taxName}
                onChange={(e) => setTaxName(e.target.value)}
                required
                className="bg-background"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Tarif Pajak (%)</Label>
              <Input 
                type="number"
                placeholder="11"
                step="0.1"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                required
                className="bg-background"
              />
            </div>
          </div>
          <DialogFooter className="pt-3 border-t border-border flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">
              Simpan Pajak
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
