import re
with open('src/pos/pos.service.ts', 'r') as f:
    pos = f.read()

pos = re.sub(
    r"const currentStock = await tx\.warehouseStock\.findUnique.*?catch \(e: any\) \{",
    r"""await this.inventoryService.issueStock(tx as any, {
              companyId, warehouseId, productId: item.productId, quantity: item.qty, referenceType: 'POS', referenceId: salesOrder.id, description: 'POS Sale', userId: userId
            });
          } catch (e: any) {""",
    pos,
    flags=re.DOTALL
)
with open('src/pos/pos.service.ts', 'w') as f:
    f.write(pos)
