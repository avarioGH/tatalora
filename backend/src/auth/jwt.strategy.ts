import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req: any) => {
          let token: string | null = null;
          if (req && req.query && req.query.token) {
            token = req.query.token;
          } else if (req && req.headers && req.headers.authorization) {
            const parts = req.headers.authorization.split(' ');
            if (parts.length === 2 && parts[0] === 'Bearer') {
              token = parts[1];
            }
          }
          if (typeof token === 'string') {
            token = token.replace(/^"(.*)"$/, '$1'); // Remove quotes if present
          }
          return token;
        }
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'fallback_super_secret_key',
    });
  }

  async validate(payload: any) {
    return {
      id: payload.sub,
      userId: payload.sub,
      username: payload.username,
      role: payload.role,
      company_id: payload.company_id,
      companyId: payload.company_id, // Keep both for backward compatibility
    };
  }
}
