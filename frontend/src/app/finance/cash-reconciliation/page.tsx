'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, ArrowLeft, CheckCircle2, AlertTriangle, BookOpen } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function CashReconciliationPage() {
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/finance/cash-reconciliation');
      setData(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: any) => {
    const num = Number(val);
    if (isNaN(num) || val === null || val === undefined) return '-';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push('/finance/cash')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Rekonsiliasi Kas & Buku Besar
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Bandingkan saldo operasional kas/bank dengan saldo akun yang tercatat pada Buku Besar (General Ledger).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push('/finance/gl')} className="gap-2">
            <BookOpen className="w-4 h-4" />
            Lihat Buku Besar
          </Button>
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Perbarui Rekonsiliasi
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Daftar Akun Kas & Status Keseimbangan</CardTitle>
          <CardDescription>
            Selisih bernilai Rp0 menandakan transaksi kas operasional dan pencatatan akuntansi berpasangan (double-entry) telah seimbang.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/40 border-y border-border">
                <tr>
                  <th className="py-3 px-4 text-left font-semibold text-xs text-muted-foreground uppercase">Akun Kas Operasional</th>
                  <th className="py-3 px-4 text-left font-semibold text-xs text-muted-foreground uppercase">Pemetaan Akun GL (COA)</th>
                  <th className="py-3 px-4 text-right font-semibold text-xs text-muted-foreground uppercase">Saldo Operasional</th>
                  <th className="py-3 px-4 text-right font-semibold text-xs text-muted-foreground uppercase">Saldo GL (Buku Besar)</th>
                  <th className="py-3 px-4 text-right font-semibold text-xs text-muted-foreground uppercase">Selisih</th>
                  <th className="py-3 px-4 text-center font-semibold text-xs text-muted-foreground uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="h-32 text-center text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                        Memuat data rekonsiliasi kas...
                      </div>
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="h-32 text-center text-muted-foreground">
                      Belum ada data akun kas terdaftar.
                    </td>
                  </tr>
                ) : (
                  data.map((row) => {
                    const operational = Number(row.operational_balance ?? row.operationalBalance ?? 0);
                    const gl = row.gl_balance !== null && row.gl_balance !== undefined ? Number(row.gl_balance) : null;
                    const diff = gl !== null ? Math.abs(operational - gl) : null;
                    const isReconciled = diff !== null && diff <= 0.01;
                    const isUnmapped = !row.mapped_coa && !row.mappedAccount;

                    return (
                      <tr key={row.cash_account_id || row.id || row.code} className="hover:bg-muted/20">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-foreground">{row.account_name || row.name || 'Kas'}</div>
                          <div className="text-xs font-mono text-muted-foreground">{row.account_code || row.code}</div>
                        </td>
                        <td className="py-3 px-4">
                          {row.mapped_coa ? (
                            <div className="text-xs">
                              <span className="font-semibold text-foreground">{row.mapped_coa.code}</span>
                              <span className="text-muted-foreground"> - {row.mapped_coa.name}</span>
                            </div>
                          ) : row.mappedAccount ? (
                            <span className="text-xs font-medium text-foreground">{row.mappedAccount}</span>
                          ) : (
                            <span className="text-xs text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              Belum Dipetakan
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-medium">
                          {formatCurrency(operational)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-medium">
                          {gl !== null ? formatCurrency(gl) : '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold">
                          {diff !== null ? (
                            <span className={diff > 100 ? 'text-rose-600 font-bold' : 'text-emerald-600'}>
                              {formatCurrency(diff)}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {isUnmapped ? (
                            <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-300">
                              Belum Dipetakan
                            </Badge>
                          ) : isReconciled ? (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Sesuai
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 gap-1">
                              <AlertTriangle className="w-3 h-3" /> Selisih
                            </Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
