'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';

interface ReconciliationResult {
 cashAccountId: string;
 code: string;
 name: string;
 operationalBalance: number;
 glBalance: number | null;
 difference: number | null;
 status: 'RECONCILED' | 'MISMATCH' | 'UNMAPPED';
 mappedAccount?: string;
}

export default function CashReconciliationPage() {
 const [data, setData] = useState<ReconciliationResult[]>([]);
 const [loading, setLoading] = useState(true);
 const { token } = useAuth();

 useEffect(() => {
 if (token) {
 loadData();
 }
 }, [token]);

 const loadData = async () => {
 try {
 const res = await api.get('/finance/cash-reconciliation');
 setData(res.data);
 } catch (e) {
 console.error(e);
 } finally {
 setLoading(false);
 }
 };

 const formatCurrency = (val: number | null) => {
 if (val === null) return '-';
 return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(val);
 };

 return (
 <div className="p-6">
 <h1 className="text-2xl font-bold mb-6">Cash & GL Reconciliation</h1>
 
 {loading ? (
 <p>Loading...</p>
 ) : (
 <div className="bg-card rounded shadow p-4 overflow-x-auto">
 <table className="min-w-[600px] md:min-w-full w-full text-left">
 <thead>
 <tr className="border-b">
 <th className="py-2 px-2">Account Name</th>
 <th className="px-2">Mapped GL Account</th>
 <th className="px-2">Operational Balance</th>
 <th className="px-2">GL Balance</th>
 <th className="px-2">Difference</th>
 <th className="px-2">Status</th>
 </tr>
 </thead>
 <tbody>
 {data.map(row => (
 <tr key={row.cashAccountId} className="border-b hover:bg-gray-50">
 <td className="py-2 px-2">{row.code} - {row.name}</td>
 <td className="px-2">{row.mappedAccount || <span className="text-gray-400">Unmapped</span>}</td>
 <td className="font-mono px-2">{formatCurrency(row.operationalBalance)}</td>
 <td className="font-mono px-2">{formatCurrency(row.glBalance)}</td>
 <td className="font-mono px-2">
 {formatCurrency(row.difference)}
 </td>
 <td className="px-2">
 {row.status === 'RECONCILED' && <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm font-medium">RECONCILED</span>}
 {row.status === 'MISMATCH' && <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-sm font-medium">MISMATCH</span>}
 {row.status === 'UNMAPPED' && <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm font-medium">UNMAPPED</span>}
 </td>
 </tr>
 ))}
 {data.length === 0 && (
 <tr>
 <td colSpan={6} className="py-4 text-center text-gray-500">No Cash Accounts found.</td>
 </tr>
 )}
 </tbody>
 </table>
 </div>
 )}
 </div>
 );
}
