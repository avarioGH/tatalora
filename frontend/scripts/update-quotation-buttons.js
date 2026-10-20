const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '../src/app/sales/quotations/[id]/page.tsx');
let content = fs.readFileSync(p, 'utf8');

if (!content.includes('Plus,')) {
    content = content.replace('import { \n  ArrowLeft', 'import { \n  ArrowLeft, Plus');
}

const newButtons = `              {data.status === 'CONFIRMED' && (
                <>
                  <Button variant="outline" className="text-emerald-600 border-emerald-600 hover:bg-emerald-50 gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Tandai sbg terkirim
                  </Button>
                  <Button onClick={() => router.push('/sales/invoices/create')} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                    <Plus className="w-4 h-4" /> Buat Tagihan
                  </Button>
                  <Button onClick={() => router.push('/sales')} className="bg-orange-500 hover:bg-orange-600 text-white gap-2">
                    <Plus className="w-4 h-4" /> Buat Pemesanan
                  </Button>
                </>
              )}
              
              <DropdownMenu>`;

content = content.replace('<DropdownMenu>', newButtons);

// change 'Diterima' to 'Disetujui Pelanggan'
content = content.replace("data.status === 'CONFIRMED' ? 'Diterima'", "data.status === 'CONFIRMED' ? 'Disetujui Pelanggan'");
// change emerald to teal for the title text
content = content.replace("text-emerald-500", "text-teal-500");

fs.writeFileSync(p, content, 'utf8');
console.log("Updated");
