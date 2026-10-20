
Add-Content prisma/schema.prisma -Value "
model Integration {
  id         String   @id @default(auto()) @map(`"_id`") @db.ObjectId
  company_id String   @db.ObjectId
  provider   String
  status     String
  config     Json?
}

model ExternalReference {
  id          String   @id @default(auto()) @map(`"_id`") @db.ObjectId
  company_id  String   @db.ObjectId
  provider    String
  entity_type String
  entity_id   String   @db.ObjectId
  external_id String
}

model IntegrationWebhookEvent {
  id             String   @id @default(auto()) @map(`"_id`") @db.ObjectId
  company_id     String   @db.ObjectId
  integration_id String   @db.ObjectId
  provider       String
  reference      String
  status         String
  payload        Json?
  error_message  String?
  retry_count    Int      @default(0)
  created_at     DateTime @default(now())
}
"

