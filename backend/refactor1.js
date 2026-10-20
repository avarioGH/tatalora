const fs = require('fs');

// 1. pos.service.ts
let pos = fs.readFileSync('src/pos/pos.service.ts', 'utf8');
pos = pos.replace(/const currentStock = await tx\.warehouseStock\.findUnique\(\{[^]*?catch \(e\) \{/m, 
wait this.inventoryService.issueStock(tx as any, {
              companyId, warehouseId, productId: item.productId, quantity: item.qty, referenceType: 'POS', referenceId: salesOrder.id, description: 'POS Sale', userId: userId
            });
          } catch (e) {);
fs.writeFileSync('src/pos/pos.service.ts', pos);
