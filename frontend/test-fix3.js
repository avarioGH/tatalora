const fs = require('fs');
let content = fs.readFileSync('src/app/sales/exports/create/page.tsx', 'utf8');
content = content.replace(
  /<CardHeader className="flex flex-row justify-between items-center bg-muted\/20 pb-4 border-b">[\s\S]*?<\/CardHeader>/g,
  `<CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-muted/20 pb-4 border-b gap-4">
              <div className="flex-1 w-full max-w-md space-y-1">
                <Label className="text-sm font-semibold">Grup (Supplier) / Pemilik Barang</Label>
                <Input 
                  placeholder="Ketik/Pilih Customer" 
                  list="customers-list"
                  value={group.groupName} 
                  onChange={e => updateGroupName(gIdx, e.target.value)} 
                  required 
                />
              </div>
              <div className="flex-1 w-full max-w-md space-y-1">
                <Label className="text-sm font-semibold text-blue-600">Atau Muat dari Transaksi (SO)</Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  onChange={(e) => {
                    handleSelectOrder(gIdx, e.target.value);
                    e.target.value = "";
                  }}
                >
                  <option value="">-- Pilih Sales Order --</option>
                  {dbOrders.map(o => (
                    <option key={o.id} value={o.id}>{o.order_number} - {o.customer?.name}</option>
                  ))}
                </select>
              </div>
              {groups.length > 1 && (
                <Button type="button" variant="ghost" className="text-destructive mt-4 sm:mt-0" onClick={() => removeGroup(gIdx)}>
                  <Trash2 className="w-4 h-4 mr-2" /> Hapus
                </Button>
              )}
            </CardHeader>`
);
fs.writeFileSync('src/app/sales/exports/create/page.tsx', content);
