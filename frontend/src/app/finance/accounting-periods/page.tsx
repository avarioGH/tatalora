'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Calendar, Lock, Unlock, Plus, AlertCircle, ShieldCheck } from 'lucide-react';

interface Period {
  id: string;
  name: string;
  month: number;
  year: number;
  start_date: string;
  end_date: string;
  status: string;
  closed_at: string | null;
  closer: { name: string } | null;
}

export default function AccountingPeriodsPage() {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formMonth, setFormMonth] = useState(String(new Date().getMonth() + 1));
  const [formYear, setFormYear] = useState(String(new Date().getFullYear()));
  const [formName, setFormName] = useState('');
  const { token } = useAuth();

  useEffect(() => {
    if (token) {
      loadPeriods();
    }
  }, [token]);

  const loadPeriods = async () => {
    try {
      const res = await api.get('/finance/accounting-periods');
      setPeriods(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    const monthNum = parseInt(formMonth, 10);
    const yearNum = parseInt(formYear, 10);
    const dateObj = new Date(yearNum, monthNum - 1, 1);
    setFormName(`${dateObj.toLocaleString('id-ID', { month: 'long' })} ${yearNum}`);
    setModalOpen(true);
  };

  const handleCreatePeriodSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const month = parseInt(formMonth, 10);
    const year = parseInt(formYear, 10);
    if (!month || !year) return;

    setSubmitting(true);
    try {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59);

      await api.post('/finance/accounting-periods', {
        name: formName || `${start.toLocaleString('id-ID', { month: 'long' })} ${year}`,
        month,
        year,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      });
      setModalOpen(false);
      loadPeriods();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Gagal membuat periode akuntansi');
    } finally {
      setSubmitting(false);
    }
  };

  const closePeriod = async (id: string, name: string) => {
    if (
      !confirm(
        `Tutup Buku Periode: ${name}?\n\nSetelah ditutup, transaksi keuangan tidak dapat lagi diposting ke tanggal dalam periode ini. Koreksi hanya dapat dicatat melalui jurnal penyesuaian di periode yang masih terbuka.`
      )
    )
      return;
    try {
      await api.post(`/finance/accounting-periods/${id}/close`);
      loadPeriods();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Error closing period');
    }
  };

  const lockPeriod = async (id: string, name: string) => {
    if (
      !confirm(
        `Kunci Permanen (LOCKED) Periode: ${name}?\n\nHanya periode yang sudah CLOSED yang dapat dikunci. Tindakan ini memblokir modifikasi administratif secara permanen.`
      )
    )
      return;
    try {
      await api.post(`/finance/accounting-periods/${id}/lock`);
      loadPeriods();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Error locking period');
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Calendar className="w-6 h-6 text-primary" />
            Kunci Periode & Tutup Buku (Accounting Periods)
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola periode pelaporan akuntansi, kunci transaksi lampau untuk mencegah perubahan data sesudah audit.
          </p>
        </div>
        <Button onClick={handleOpenCreateModal} className="bg-primary text-primary-foreground gap-2">
          <Plus className="w-4 h-4" /> Buat Periode Baru
        </Button>
      </div>

      {/* Modal Dialog Buat Periode */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <form onSubmit={handleCreatePeriodSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                Buat Periode Akuntansi Baru
              </DialogTitle>
              <DialogDescription>
                Tentukan bulan dan tahun buku. Seluruh posting jurnal dalam rentang tanggal ini akan dikelompokkan ke periode tersebut.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Bulan (1 - 12)</Label>
                  <select
                    className="w-full px-3 py-2 rounded-md bg-background border border-border text-foreground text-sm"
                    value={formMonth}
                    onChange={(e) => {
                      setFormMonth(e.target.value);
                      const d = new Date(parseInt(formYear, 10), parseInt(e.target.value, 10) - 1, 1);
                      setFormName(`${d.toLocaleString('id-ID', { month: 'long' })} ${formYear}`);
                    }}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                      <option key={m} value={m}>
                        Bulan {m} ({new Date(2026, m - 1, 1).toLocaleString('id-ID', { month: 'long' })})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <Label>Tahun Fiskal</Label>
                  <Input
                    type="number"
                    value={formYear}
                    onChange={(e) => {
                      setFormYear(e.target.value);
                      const d = new Date(parseInt(e.target.value, 10), parseInt(formMonth, 10) - 1, 1);
                      setFormName(`${d.toLocaleString('id-ID', { month: 'long' })} ${e.target.value}`);
                    }}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label>Nama Periode</Label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Contoh: November 2026"
                  required
                />
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Periode baru akan dibuat dengan status <strong>OPEN</strong> sehingga staf dapat memposting transaksi penjualan, pembelian, dan jurnal umum.
                </span>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={submitting} className="bg-primary text-primary-foreground">
                {submitting ? 'Menyimpan...' : 'Buat Periode'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {loading ? (
        <p className="text-sm text-muted-foreground">Memuat data periode...</p>
      ) : (
        <div className="bg-card rounded-lg shadow-sm border border-border p-4 overflow-x-auto">
          <table className="min-w-[600px] md:min-w-full w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="py-3 px-4 font-semibold">Nama Periode</th>
                <th className="py-3 px-4 font-semibold">Tanggal Mulai</th>
                <th className="py-3 px-4 font-semibold">Tanggal Selesai</th>
                <th className="py-3 px-4 font-semibold text-center">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Tindakan Kontrol</th>
              </tr>
            </thead>
            <tbody>
              {periods.map((p) => (
                <tr key={p.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-4 font-semibold text-foreground">
                    {p.name || `${p.month}/${p.year}`}
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">
                    {new Date(p.start_date).toLocaleDateString('id-ID')}
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">
                    {new Date(p.end_date).toLocaleDateString('id-ID')}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {p.status === 'OPEN' && (
                      <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 rounded-full text-xs font-semibold">
                        TERBUKA (OPEN)
                      </span>
                    )}
                    {p.status === 'CLOSED' && (
                      <span className="px-2.5 py-1 bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 rounded-full text-xs font-semibold">
                        TUTUP BUKU (CLOSED)
                      </span>
                    )}
                    {p.status === 'LOCKED' && (
                      <span className="px-2.5 py-1 bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 rounded-full text-xs font-semibold">
                        DIKUNCI (LOCKED)
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right space-x-2">
                    {p.status === 'OPEN' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => closePeriod(p.id, p.name)}
                        className="text-amber-600 border-amber-300 hover:bg-amber-50 gap-1.5 h-8 text-xs"
                      >
                        <Lock className="w-3.5 h-3.5" /> Tutup Buku
                      </Button>
                    )}
                    {p.status === 'CLOSED' && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => lockPeriod(p.id, p.name)}
                        className="gap-1.5 h-8 text-xs"
                      >
                        <Lock className="w-3.5 h-3.5" /> Kunci Permanen
                      </Button>
                    )}
                    {p.status !== 'OPEN' && p.closed_at && (
                      <span className="text-xs text-muted-foreground block mt-1">
                        Ditutup oleh {p.closer?.name || 'Admin'} tgl {new Date(p.closed_at).toLocaleDateString('id-ID')}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {periods.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">
                    Belum ada periode akuntansi yang dibuat. Klik tombol &quot;Buat Periode Baru&quot; di atas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
