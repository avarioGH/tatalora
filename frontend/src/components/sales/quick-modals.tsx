import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api, InventoryAPI } from '@/lib/api';
import { UserPlus, Box, Percent } from 'lucide-react';

export function QuickAddCustomerModal({
  open,
  onOpenChange,
  onSuccess
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (newCust: any) => void;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert('Nama pelanggan wajib diisi!');

    setLoading(true);
    try {
      const res = await api.post('/customers', {
        name,
        phone,
        email,
        address
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
      alert('Gagal menambah pelanggan: ' + (err.response?.data?.message || err.message));
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
              <UserPlus className="w-5 h-5 text-indigo-600" /> Tambah Pelanggan Baru
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nama Pelanggan / Perusahaan <span className="text-rose-500">*</span></Label>
              <Input 
                placeholder="Contoh: PT Sumber Jaya Sentosa / Bpk. Budi"
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
                placeholder="Alamat pengiriman / penagihan..."
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
              {loading ? 'Menyimpan...' : 'Simpan Pelanggan'}
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
  const [loading, setLoading] = useState(false);

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

      const created = await InventoryAPI.createProduct(payload);
      onSuccess(created);
      onOpenChange(false);
      setName('');
      setCode('');
      setSellingPrice('');
      setPurchasePrice('0');
    } catch (err: any) {
      console.error(err);
      alert('Gagal menambah produk: ' + (err.response?.data?.message || err.message));
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
              <Box className="w-5 h-5 text-indigo-600" /> Tambah Produk Baru
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nama Produk <span className="text-rose-500">*</span></Label>
              <Input 
                placeholder="Contoh: Balok Kayu Meranti 5x7"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="bg-background"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Kode / SKU (Opsional, kosongkan utk otomatis)</Label>
              <Input 
                placeholder="PRD-0001"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="bg-background"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Harga Beli / Pokok (Rp)</Label>
                <Input 
                  type="number"
                  placeholder="0"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  className="bg-background"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Harga Jual (Rp) <span className="text-rose-500">*</span></Label>
                <Input 
                  type="number"
                  placeholder="0"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  required
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
              <Percent className="w-5 h-5 text-indigo-600" /> Tambah Pajak Baru
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nama Pajak <span className="text-rose-500">*</span></Label>
              <Input 
                placeholder="Contoh: PPh 23, PPN 12%"
                value={taxName}
                onChange={(e) => setTaxName(e.target.value)}
                required
                className="bg-background"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Tarif Efektif (%) <span className="text-rose-500">*</span></Label>
              <Input 
                type="number"
                step="0.1"
                min="0"
                max="100"
                placeholder="11"
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
              Tambah Pajak
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
