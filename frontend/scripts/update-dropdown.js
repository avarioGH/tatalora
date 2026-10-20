const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '../src/app/sales/quotations/[id]/page.tsx');
let content = fs.readFileSync(p, 'utf8');

const importsToAdd = `import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, Copy, Trash2 } from "lucide-react";
`;
content = content.replace(`import { B2BApi } from '@/lib/api'`, importsToAdd + `import { B2BApi } from '@/lib/api'`);

const handleDelete = `  const handleDelete = async () => {
    if(confirm('Apakah Anda yakin ingin menghapus penawaran ini?')) {
      alert('Fitur hapus belum tersedia di API, tapi UI sudah siap!');
    }
  }

  if (loading)`;
content = content.replace('  if (loading)', handleDelete);

const moreOptionsBtn = '<Button variant="outline" size="icon" className="bg-background"><MoreVertical className="w-4 h-4" /></Button>';
const dropdownMenu = `<DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="bg-background"><MoreVertical className="w-4 h-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem className="py-2 cursor-pointer" onClick={() => alert('Lihat Audit UI')}>
                    <Search className="w-4 h-4 mr-2 text-muted-foreground" /> Lihat Audit
                  </DropdownMenuItem>
                  <DropdownMenuItem className="py-2 cursor-pointer" onClick={() => alert('Ubah UI')}>
                    <Edit2 className="w-4 h-4 mr-2 text-muted-foreground" /> Ubah
                  </DropdownMenuItem>
                  <DropdownMenuItem className="py-2 cursor-pointer" onClick={() => alert('Duplikat UI')}>
                    <Copy className="w-4 h-4 mr-2 text-muted-foreground" /> Duplikat
                  </DropdownMenuItem>
                  <DropdownMenuItem className="py-2 cursor-pointer text-rose-600 focus:text-rose-600 focus:bg-rose-50" onClick={handleDelete}>
                    <Trash2 className="w-4 h-4 mr-2" /> Hapus
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>`;
content = content.replace(moreOptionsBtn, dropdownMenu);

fs.writeFileSync(p, content, 'utf8');
console.log("Done");
