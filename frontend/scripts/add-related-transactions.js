const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '../src/app/sales/quotations/[id]/page.tsx');
let content = fs.readFileSync(p, 'utf8');

const auditCardEnd = `</CardContent>\n      </Card>`;
const relatedTransactionsSection = `
      {/* Related Transactions Card */}
      {data.sales_orders && data.sales_orders.length > 0 && (
        <Card className="shadow-sm border-border">
          <CardContent className="p-6">
            <p className="font-semibold text-lg mb-4">Transaksi Terkait</p>
            <div className="space-y-4">
              {data.sales_orders.map((so: any) => (
                <div key={so.id} className="border border-border rounded-md p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="font-medium text-indigo-600 cursor-pointer hover:underline" onClick={() => router.push('/sales/orders?id=' + so.id)}>
                      Pemesanan: {so.order_number}
                    </div>
                    <span className="text-sm bg-muted px-2 py-1 rounded-md">{so.status}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{new Date(so.order_date).toLocaleDateString('id-ID')}</span>
                    <span>Rp {new Intl.NumberFormat('id-ID').format(so.total_amount || 0)}</span>
                  </div>
                  
                  {/* Nested Deliveries */}
                  {so.deliveries && so.deliveries.length > 0 && so.deliveries.map((del: any) => (
                    <div key={del.id} className="ml-4 pl-4 border-l-2 border-indigo-200 mt-2">
                      <div className="flex justify-between items-center">
                        <div className="text-sm font-medium text-indigo-500 cursor-pointer hover:underline" onClick={() => router.push('/sales/deliveries?id=' + del.id)}>
                          Pengiriman: {del.delivery_number}
                        </div>
                        <span className="text-xs bg-muted px-2 py-1 rounded-md">{del.status}</span>
                      </div>
                    </div>
                  ))}

                  {/* Nested Invoices */}
                  {so.invoices && so.invoices.length > 0 && so.invoices.map((inv: any) => (
                    <div key={inv.id} className="ml-4 pl-4 border-l-2 border-emerald-200 mt-2">
                      <div className="flex justify-between items-center">
                        <div className="text-sm font-medium text-emerald-600 cursor-pointer hover:underline" onClick={() => router.push('/sales/invoices?id=' + inv.id)}>
                          Tagihan: {inv.invoice_number}
                        </div>
                        <span className="text-xs bg-muted px-2 py-1 rounded-md">{inv.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
`;

if (!content.includes('Transaksi Terkait')) {
  content = content.replace(auditCardEnd, auditCardEnd + '\n' + relatedTransactionsSection);
  fs.writeFileSync(p, content, 'utf8');
}
console.log('Added related transactions');
