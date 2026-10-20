import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const reports = [
 { group: 'Stock & Inventory', items: [
 { title: 'Stock by Location', path: '/inventory/reports/stock-by-location', desc: 'Current stock balances aggregated by warehouse' },
 { title: 'Stock by Product', path: '/inventory/reports/stock-by-product', desc: 'Current stock grouped by species/product' },
 { title: 'Stock by Size', path: '/inventory/reports/stock-by-size', desc: 'Current stock detailed by dimensional sizes' },
 { title: 'Stock Aging', path: '/inventory/reports/stock-aging', desc: 'Inventory aging report grouped by days in stock (FIFO)' },
 { title: 'Low / Zero Stock', path: '/inventory/reports/low-stock', desc: 'SKUs requiring replenishment' }
 ]},
 { group: 'Movements & Production', items: [
 { title: 'Movements Ledger', path: '/inventory/movements', desc: 'Complete log of IN, OUT, and ADJ transactions' },
 { title: 'Production Output', path: '/production/sawmill/bundles', desc: 'Finished Sawn Timber generated' },
 { title: 'Production Yield', path: '/inventory/reports/yield', desc: 'Efficiency report (% M3 Output vs Input)' }
 ]},
 { group: 'Raw Material', items: [
 { title: 'Raw Logs', path: '/inventory/logs', desc: 'Unprocessed timber logs inventory' },
 { title: 'Trimming', path: '/inventory/trimming', desc: 'Trimming logs yield and conversion' },
 { title: 'Input / WIP', path: '/inventory/input-logs', desc: 'Input logs staged for production' }
 ]},
 { group: 'Audit & Traceability', items: [
 { title: 'Traceability', path: '/inventory/reports/traceability', desc: 'Forward & backward trace of log history' },
 { title: 'Excel Reconciliation', path: '/inventory/audit', desc: 'Phase 8.5 Data integrity audit view' }
 ]}
];

export default function ReportsIndex() {
 return (
 <div className="p-4 md:p-8 space-y-8">
 <h1 className="text-3xl font-bold">Inventory Reports</h1>
 <div className="space-y-8">
 {reports.map(group => (
 <div key={group.group}>
 <h2 className="text-xl font-semibold mb-4 text-foreground/80">{group.group}</h2>
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {group.items.map(item => (
 <Link key={item.path} href={item.path}>
 <Card className="hover:bg-muted/30 transition-colors cursor-pointer h-full">
 <CardHeader className="pb-2">
 <CardTitle className="text-lg text-primary">{item.title}</CardTitle>
 </CardHeader>
 <CardContent>
 <p className="text-sm text-muted-foreground">{item.desc}</p>
 </CardContent>
 </Card>
 </Link>
 ))}
 </div>
 </div>
 ))}
 </div>
 </div>
 );
}




