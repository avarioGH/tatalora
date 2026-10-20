'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';


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
 const { token } = useAuth();

 useEffect(() => {
 if (token) {
 loadPeriods();
 }
 }, [token]);

 const loadPeriods = async () => {
 try {
 const res = await api.get('/finance/accounting-periods');
 setPeriods(res.data);
 } catch (e) {
 console.error(e);
 } finally {
 setLoading(false);
 }
 };

 const createPeriod = async () => {
 const month = prompt('Enter month (1-12):');
 const year = prompt('Enter year (e.g. 2026):');
 if (!month || !year) return;
 
 try {
 const start = new Date(parseInt(year), parseInt(month) - 1, 1);
 const end = new Date(parseInt(year), parseInt(month), 0);
 
 await api.post('/finance/accounting-periods', {
 name: `${start.toLocaleString('default', { month: 'long' })} ${year}`,
 month: parseInt(month),
 year: parseInt(year),
 startDate: start.toISOString(),
 endDate: end.toISOString()
 });
 loadPeriods();
 } catch (e: any) {
 alert(e.response?.data?.message || 'Error creating period');
 }
 };

 const closePeriod = async (id: string, name: string) => {
 if (!confirm(`Close ${name}?\n\nAfter closing, new accounting postings cannot be made to this period. Corrections must be posted through an open accounting period.`)) return;
 try {
 await api.post(`/finance/accounting-periods/${id}/close`);
 loadPeriods();
 } catch (e: any) {
 alert(e.response?.data?.message || 'Error closing period');
 }
 };

 const lockPeriod = async (id: string, name: string) => {
 if (!confirm(`Lock ${name}?\n\nOnly CLOSED periods can be locked. This blocks administrative modification.`)) return;
 try {
 await api.post(`/finance/accounting-periods/${id}/lock`);
 loadPeriods();
 } catch (e: any) {
 alert(e.response?.data?.message || 'Error locking period');
 }
 };

 return (
 <div className="p-6">
 <div className="flex justify-between items-center mb-6">
 <h1 className="text-2xl font-bold">Accounting Periods</h1>
 <button onClick={createPeriod} className="bg-blue-600 text-white px-4 py-2 rounded">
 Create Period
 </button>
 </div>
 
 {loading ? (
 <p>Loading...</p>
 ) : (
 <div className="bg-card rounded shadow p-4 overflow-x-auto">
 <table className="min-w-[600px] md:min-w-full w-full text-left">
 <thead>
 <tr className="border-b">
 <th className="py-2 px-2">Period Name</th>
 <th className="px-2">Start Date</th>
 <th className="px-2">End Date</th>
 <th className="px-2">Status</th>
 <th className="px-2">Actions</th>
 </tr>
 </thead>
 <tbody>
 {periods.map(p => (
 <tr key={p.id} className="border-b hover:bg-gray-50">
 <td className="py-2 px-2 font-semibold">{p.name || `${p.month}/${p.year}`}</td>
 <td className="px-2">{new Date(p.start_date).toLocaleDateString()}</td>
 <td className="px-2">{new Date(p.end_date).toLocaleDateString()}</td>
 <td className="px-2">
 {p.status === 'OPEN' && <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm font-medium">OPEN</span>}
 {p.status === 'CLOSED' && <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-sm font-medium">CLOSED</span>}
 {p.status === 'LOCKED' && <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-sm font-medium">LOCKED</span>}
 </td>
 <td className="px-2 space-x-2">
 {p.status === 'OPEN' && (
 <button onClick={() => closePeriod(p.id, p.name)} className="text-sm text-yellow-600 font-semibold hover:underline">Close</button>
 )}
 {p.status === 'CLOSED' && (
 <button onClick={() => lockPeriod(p.id, p.name)} className="text-sm text-red-600 font-semibold hover:underline">Lock</button>
 )}
 {p.status !== 'OPEN' && p.closed_at && (
 <span className="text-xs text-gray-500 block">By {p.closer?.name} on {new Date(p.closed_at).toLocaleDateString()}</span>
 )}
 </td>
 </tr>
 ))}
 {periods.length === 0 && (
 <tr>
 <td colSpan={5} className="py-4 text-center text-gray-500">No Accounting Periods found.</td>
 </tr>
 )}
 </tbody>
 </table>
 </div>
 )}
 </div>
 );
}
