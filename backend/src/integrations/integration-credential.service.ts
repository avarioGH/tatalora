import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class IntegrationCredentialService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly secretKey: Buffer;

  constructor(private prisma: PrismaService) {
    const secret = process.env.JWT_SECRET || 'default-insecure-secret-key-32b';
    this.secretKey = crypto.scryptSync(secret, 'salt', 32);
  }

  encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.secretKey, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  decrypt(encryptedText: string): string {
    const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
    if (!ivHex || !authTagHex || !encrypted)
      throw new Error('Invalid encrypted format');
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.secretKey,
      Buffer.from(ivHex, 'hex'),
    );
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  async storeCredential(integrationId: string, key: string, value: string) {
    const encrypted = this.encrypt(value);
    await (this.prisma as any).integrationCredential.upsert({
      where: { integration_id_key: { integration_id: integrationId, key } },
      update: { encrypted_value: encrypted },
      create: {
        integration_id: integrationId,
        key,
        encrypted_value: encrypted,
      },
    });
  }

  async getCredential(
    integrationId: string,
    key: string,
  ): Promise<string | null> {
    const cred = await (this.prisma as any).integrationCredential.findUnique({
      where: { integration_id_key: { integration_id: integrationId, key } },
    });
    if (!cred) return null;
    return this.decrypt(cred.encrypted_value);
  }
}
