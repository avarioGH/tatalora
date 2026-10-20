import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import { Controller, Post, Body, Req, UseGuards, ForbiddenException } from '@nestjs/common';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/ai')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Permissions('ai.create')
  @Post('chat')
  async chat(
    @Req() req,
    @Body() body: { prompt: string; chatHistory?: any[] },
  ) {
    if (req.user.role?.toLowerCase() !== 'owner') {
      throw new ForbiddenException('Fitur Chat AI ini hanya dapat diakses oleh Owner.');
    }
    return this.aiService.handleChat(
      req.user,
      body.prompt,
      body.chatHistory || [],
    );
  }

  async _old_chat(
    @Req() req,
    @Body() body: { prompt: string; chatHistory?: any[] },
  ) {
    return this.aiService.handleChat(
      req.user,
      body.prompt,
      body.chatHistory || [],
    );
  }

  @Permissions('ai.create')
  @Post('execute')
  async executeAction(@Req() req, @Body() body: { actionData: any }) {
    return this.aiService.executeAction(req.user.company_id, body.actionData);
  }

  @Permissions('ai.create')
  @Post('undo')
  async undoAction(@Req() req, @Body() body: { actionData: any }) {
    return this.aiService.undoAction(req.user.company_id, body.actionData);
  }

  @Permissions('ai.create')
  @Post('history')
  async getHistory(@Req() req) {
    return this.aiService.getHistory(req.user.company_id, req.user.id);
  }
}
