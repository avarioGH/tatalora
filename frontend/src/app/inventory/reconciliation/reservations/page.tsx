'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ShieldAlert, CheckCircle2, AlertTriangle, AlertCircle, Info, RefreshCw, X, Box, ClipboardList, Database, LayoutPanelLeft } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface ReconciliationRow {
  companyId: string;
  locationId: string | null;
  timberVariantId: string;
  physicalPcs: number;
  physicalM3: number;
  expectedReservedPcs: number;
  actualReservedPcs: number;
  expectedReservedM3: number;
  actualReservedM3: number;
  availablePcs: number;
  availableM3: number;
  differencePcs: number;
  differenceM3: number;
  statusFlags: string[];
}

interface DetailData extends ReconciliationRow {
  stockBatches: any[];
  openOrders: any[];
  reservationSummary: any;
}

export default function ReservationReconciliationPage() {
  const [data, setData] = useState<ReconciliationRow[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [filterLocation, setFilterLocation] = useState('');
  const [filterVariant, setFilterVariant] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  
  const [selectedRow, setSelectedRow] = useState<ReconciliationRow | null>(null);
  const [detailData, setDetailData] = useState<DetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterLocation) params.append('locationId', filterLocation);
      if (filterVariant) params.append('timberVariantId', filterVariant);
      if (filterStatus && filterStatus !== 'ALL') params.append('status', filterStatus);
      
      const res = await api.get('/inventory/reservation-reconciliation?' + params.toString());
      setData(res.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [filterLocation, filterStatus, filterVariant]);

  const openDetail = async (row: ReconciliationRow) => {
    setSelectedRow(row);
    setDetailLoading(true);
    setDetailData(null);
    try {
      const res = await api.get(`/inventory/reservation-reconciliation/detail?locationId=${row.locationId || 'NULL'}&timberVariantId=${row.timberVariantId}`);
      setDetailData(res.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setDetailLoading(false);
    }
  };

  const getStatusColor = (flag: string) => {
    if (flag === 'HEALTHY' || flag === 'MATCH') return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
    if (flag === 'NEGATIVE_AVAILABLE') return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border-red-200 dark:border-red-800';
    if (flag === 'OVER_RESERVED' || flag === 'UNDER_RESERVED' || flag === 'RESERVATION_DRIFT') return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400 border-orange-200 dark:border-orange-800';
    if (flag === 'LEGACY_OPEN_ORDER_NO_WAREHOUSE' || flag === 'LEGACY_UNRESERVED') return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 border-blue-200 dark:border-blue-800';
    if (flag === 'ORPHAN_RESERVATION') return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400 border-purple-200 dark:border-purple-800';
    return 'bg-slate-100 dark:bg-slate-800 text-foreground dark:text-slate-300 border-border dark:border-slate-700';
  };

  const getStatusIcon = (flag: string) => {
    if (flag === 'HEALTHY' || flag === 'MATCH') return <CheckCircle2 className="w-3 h-3 mr-1 inline" />;
    if (flag === 'NEGATIVE_AVAILABLE') return <ShieldAlert className="w-3 h-3 mr-1 inline" />;
    if (flag === 'LEGACY_OPEN_ORDER_NO_WAREHOUSE' || flag === 'LEGACY_UNRESERVED') return <Info className="w-3 h-3 mr-1 inline" />;
    return <AlertTriangle className="w-3 h-3 mr-1 inline" />;
  };

  // Stats calculation
  const totalPhysical = data.reduce((sum, r) => sum + r.physicalPcs, 0);
  const totalReserved = data.reduce((sum, r) => sum + r.actualReservedPcs, 0);
  const totalAvailable = data.reduce((sum, r) => sum + r.availablePcs, 0);
  const totalHealthy = (Array.isArray(data) ? data : []).filter(r => r.statusFlags.includes('HEALTHY')).length;
  const anomaliesCount = data.length - totalHealthy;
  
  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6 pb-20">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Database className="w-6 h-6 text-primary" />
            Reservation Reconciliation
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Read-only audit tool for detecting reservation drift and concurrency anomalies.</p>
        </div>
        <Badge variant="outline" className="bg-amber-100/50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/50 px-3 py-1">
          <ShieldAlert className="w-4 h-4 mr-2 inline" /> Read-Only Investigation
        </Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Box className="w-3 h-3"/> Physical Stock</p>
            <p className="text-2xl font-bold mt-1">{totalPhysical.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><ClipboardList className="w-3 h-3"/> Actual Reserved</p>
            <p className="text-2xl font-bold mt-1">{totalReserved.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><LayoutPanelLeft className="w-3 h-3"/> Available</p>
            <p className="text-2xl font-bold mt-1">{totalAvailable.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30">
          <CardContent className="p-4">
            <p className="text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Healthy Rows</p>
            <p className="text-2xl font-bold mt-1 text-emerald-700 dark:text-emerald-400">{totalHealthy}</p>
          </CardContent>
        </Card>
        <Card className="bg-rose-50/50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/30">
          <CardContent className="p-4">
            <p className="text-xs text-rose-700 dark:text-rose-400 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Anomalies</p>
            <p className="text-2xl font-bold mt-1 text-rose-700 dark:text-rose-400">{anomaliesCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-end bg-muted/50 p-4 rounded-md border">
        <div className="w-[250px]">
          <label className="text-xs font-semibold mb-1 block">Warehouse ID</label>
          <Input placeholder="Filter by Warehouse ID..." value={filterLocation} onChange={e => setFilterLocation(e.target.value)} />
        </div>
        <div className="w-[250px]">
          <label className="text-xs font-semibold mb-1 block">Variant / SKU</label>
          <Input placeholder="Filter by Variant ID..." value={filterVariant} onChange={e => setFilterVariant(e.target.value)} />
        </div>
        <div className="w-[250px]">
          <label className="text-xs font-semibold mb-1 block">Status</label>
          <Select value={filterStatus} onValueChange={(val) => setFilterStatus(val || 'ALL')}>
            <SelectTrigger><SelectValue placeholder="All Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="HEALTHY">HEALTHY</SelectItem>
              <SelectItem value="OVER_RESERVED">OVER_RESERVED</SelectItem>
              <SelectItem value="UNDER_RESERVED">UNDER_RESERVED</SelectItem>
              <SelectItem value="NEGATIVE_AVAILABLE">NEGATIVE_AVAILABLE</SelectItem>
              <SelectItem value="RESERVATION_DRIFT">RESERVATION_DRIFT</SelectItem>
              <SelectItem value="LEGACY_OPEN_ORDER_NO_WAREHOUSE">LEGACY_OPEN_ORDER_NO_WAREHOUSE</SelectItem>
              <SelectItem value="LEGACY_UNRESERVED">LEGACY_UNRESERVED</SelectItem>
              <SelectItem value="ORPHAN_RESERVATION">ORPHAN_RESERVATION</SelectItem>
              <SelectItem value="INVALID_DRAFT_RESERVATION">INVALID_DRAFT_RESERVATION</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" onClick={fetchSummary} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />} Reload
        </Button>
      </div>

      {/* Table */}
      <div className="border rounded-md bg-card overflow-hidden shadow-sm">
        <ScrollArea className="h-[600px] w-full">
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0 z-10 shadow-sm">
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead>Variant ID</TableHead>
                <TableHead className="text-right">Physical</TableHead>
                <TableHead className="text-right">Actual Reserved</TableHead>
                <TableHead className="text-right">Expected</TableHead>
                <TableHead className="text-right">Available</TableHead>
                <TableHead className="text-right">Diff</TableHead>
                <TableHead className="text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && data.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-10"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
              ) : data.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-10 text-muted-foreground">No records found matching filters.</TableCell></TableRow>
              ) : (
                data.map((row, i) => (
                  <TableRow key={i} className="hover:bg-muted/50">
                    <TableCell className="w-[300px]">
                      <div className="flex flex-wrap gap-1">
                        {row.statusFlags.map(f => (
                          <Badge key={f} variant="outline" className={`${getStatusColor(f)} text-[10px]`}>
                            {getStatusIcon(f)}
                            {f}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{row.locationId || <span className="text-muted-foreground italic">NULL (Legacy)</span>}</TableCell>
                    <TableCell className="font-mono text-xs max-w-[150px] truncate" title={row.timberVariantId}>{row.timberVariantId}</TableCell>
                    <TableCell className="text-right font-medium">{row.physicalPcs}</TableCell>
                    <TableCell className="text-right font-medium">{row.actualReservedPcs}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{row.expectedReservedPcs}</TableCell>
                    <TableCell className={`text-right font-bold ${row.availablePcs < 0 ? 'text-red-600' : 'text-emerald-600'}`}>{row.availablePcs}</TableCell>
                    <TableCell className={`text-right font-mono text-xs ${row.differencePcs !== 0 ? 'text-orange-600 font-bold' : 'text-muted-foreground'}`}>
                      {row.differencePcs > 0 ? '+' : ''}{row.differencePcs !== 0 ? row.differencePcs : '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button size="sm" variant="ghost" onClick={() => openDetail(row)}>Inspect</Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedRow} onOpenChange={(open) => !open && setSelectedRow(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b bg-muted/50">
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-indigo-600" />
              Reservation Investigation
            </DialogTitle>
            <DialogDescription>
              Detailed breakdown of variant {selectedRow?.timberVariantId} at warehouse {selectedRow?.locationId || 'NULL'}.
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="flex-1 p-6">
            {detailLoading || !detailData ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin mb-4" />
                <p>Loading investigation data...</p>
              </div>
            ) : (
              <div className="space-y-8">
                
                {/* Status Banners */}
                <div className="flex flex-wrap gap-2">
                  {detailData.statusFlags.map(f => (
                    <Badge key={f} variant="outline" className={`${getStatusColor(f)} px-3 py-1.5 text-sm`}>
                      {getStatusIcon(f)} {f}
                    </Badge>
                  ))}
                </div>

                {/* Main Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 border rounded bg-card shadow-sm">
                    <p className="text-xs text-muted-foreground mb-1">Physical Stock</p>
                    <p className="text-2xl font-bold">{detailData.physicalPcs} <span className="text-sm font-normal text-muted-foreground">PCS</span></p>
                  </div>
                  <div className="p-4 border rounded bg-card shadow-sm border-blue-200 dark:border-blue-900/50">
                    <p className="text-xs text-blue-700 dark:text-blue-400 mb-1">Actual Reserved</p>
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{detailData.actualReservedPcs} <span className="text-sm font-normal text-blue-500 dark:text-blue-400">PCS</span></p>
                  </div>
                  <div className="p-4 border rounded bg-card shadow-sm border-purple-200 dark:border-purple-900/50">
                    <p className="text-xs text-purple-700 dark:text-purple-400 mb-1">Expected Reserved</p>
                    <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">{detailData.expectedReservedPcs} <span className="text-sm font-normal text-purple-500 dark:text-purple-400">PCS</span></p>
                  </div>
                  <div className={`p-4 border rounded bg-card shadow-sm ${detailData.availablePcs < 0 ? 'border-red-300 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20' : 'border-emerald-200 dark:border-emerald-900/50'}`}>
                    <p className={`text-xs mb-1 ${detailData.availablePcs < 0 ? 'text-red-700 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'}`}>Available (Phys - Actual)</p>
                    <p className={`text-2xl font-bold ${detailData.availablePcs < 0 ? 'text-red-700 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                      {detailData.availablePcs} <span className="text-sm font-normal opacity-50">PCS</span>
                    </p>
                  </div>
                </div>

                {/* Deterministic Explanation */}
                <div className="bg-muted/50 border rounded p-4 text-sm space-y-2">
                  <h3 className="font-semibold text-foreground flex items-center gap-2"><Info className="w-4 h-4"/> Investigation Notes</h3>
                  {detailData.differencePcs > 0 && (
                    <p className="text-orange-700">Actual reservation exceeds expected reservation by <strong>{detailData.differencePcs} PCS</strong>. This indicates an Orphan Reservation or Drift.</p>
                  )}
                  {detailData.differencePcs < 0 && (
                    <p className="text-rose-700 dark:text-rose-400">Actual reservation is lower than expected by <strong>{Math.abs(detailData.differencePcs)} PCS</strong>. This indicates Under-Reservation.</p>
                  )}
                  {detailData.availablePcs < 0 && (
                    <p className="text-red-700 dark:text-red-400">Physical stock is below actual reserved quantity by <strong>{Math.abs(detailData.availablePcs)} PCS</strong>. This suggests stock was destroyed/adjusted without reservation release.</p>
                  )}
                  {detailData.statusFlags.includes('LEGACY_UNRESERVED') && (
                    <p className="text-blue-700 dark:text-blue-400">Legacy orders exist but are completely unreserved in this warehouse. This represents older demand that predates the reservation system.</p>
                  )}
                  {detailData.statusFlags.includes('LEGACY_OPEN_ORDER_NO_WAREHOUSE') && (
                    <p className="text-blue-700 dark:text-blue-400">Legacy open sales order exists without a fulfillment warehouse. It is excluded from warehouse-specific reservations.</p>
                  )}
                  {detailData.statusFlags.includes('MATCH') && (
                    <p className="text-emerald-700 dark:text-emerald-400">Everything is perfectly balanced. No anomalies detected.</p>
                  )}
                </div>

                {/* Open Orders Table */}
                <div>
                  <h3 className="text-lg font-semibold border-b pb-2 mb-3 text-foreground">Contributing Sales Orders ({detailData.openOrders.length})</h3>
                  <div className="border rounded-md overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead>SO Number</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Remaining PCS</TableHead>
                          <TableHead className="text-right">Remaining M3</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detailData.openOrders.length === 0 ? (
                          <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No open orders for this warehouse+variant.</TableCell></TableRow>
                        ) : (
                          detailData.openOrders.map((o, i) => (
                            <TableRow key={i}>
                              <TableCell className="font-medium text-blue-600">{o.soNumber}</TableCell>
                              <TableCell><Badge variant="secondary" className="text-[10px]">{o.status}</Badge></TableCell>
                              <TableCell className="text-right font-medium">{o.remainingPcs}</TableCell>
                              <TableCell className="text-right text-muted-foreground">{o.remainingM3.toFixed(4)}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Stock Batches Table */}
                <div>
                  <h3 className="text-lg font-semibold border-b pb-2 mb-3 text-foreground">Physical Stock Batches ({detailData.stockBatches.length})</h3>
                  <div className="border rounded-md overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead>Batch</TableHead>
                          <TableHead className="text-right">Current PCS</TableHead>
                          <TableHead className="text-right">Current M3</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detailData.stockBatches.length === 0 ? (
                          <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">No physical stock batches found.</TableCell></TableRow>
                        ) : (
                          detailData.stockBatches.map((b, i) => (
                            <TableRow key={i}>
                              <TableCell className="font-mono text-xs">{b.batch}</TableCell>
                              <TableCell className="text-right font-medium">{b.pcs}</TableCell>
                              <TableCell className="text-right text-muted-foreground">{b.m3.toFixed(4)}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
