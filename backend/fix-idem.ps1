
Add-Content prisma/schema.prisma -Value "
model IntegrationIdempotency {
  id              String   @id @default(auto()) @map(`"_id`") @db.ObjectId
  company_id      String   @db.ObjectId
  integration_id  String   @db.ObjectId
  idempotency_key String
  operation       String
  status          String
  response        Json?
  created_at      DateTime @default(now())
  
  @@unique([company_id, integration_id, idempotency_key])
}
"

