
Add-Content -Path prisma/schema.prisma -Value "
model EcommerceCart {
  id         String   @id @default(auto()) @map(`"_id`") @db.ObjectId
  company_id String   @db.ObjectId
  company    Company  @relation(fields: [company_id], references: [id], onDelete: NoAction, onUpdate: NoAction)
  session_id String

  items EcommerceCartItem[]

  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  @@unique([company_id, session_id])
}

model EcommerceCartItem {
  id         String   @id @default(auto()) @map(`"_id`") @db.ObjectId
  cart_id    String   @db.ObjectId
  cart       EcommerceCart @relation(fields: [cart_id], references: [id], onDelete: Cascade)
  product_id String   @db.ObjectId
  product    Product  @relation(fields: [product_id], references: [id], onDelete: NoAction, onUpdate: NoAction)
  quantity   Int

  created_at DateTime @default(now())
  updated_at DateTime @updatedAt
}
"

