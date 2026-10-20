import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export interface WorkflowEventPayload {
  companyId: string;
  eventName: string; // e.g. "Inventory.Created", "Finance.Approved"
  module: string;
  referenceId: string;
  data: any; // The JSON payload of the transaction
  userId: string;
}

@Injectable()
export class AutomationService {
  private readonly logger = new Logger(AutomationService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Event Listener & Rule Engine Evaluator
   * Dipanggil oleh seluruh modul di ERP saat terjadi perubahan status/data.
   */
  async handleEvent(payload: WorkflowEventPayload) {
    this.logger.log(
      `Received Event: ${payload.eventName} for Reference: ${payload.referenceId}`,
    );

    // 1. Cari Workflow aktif yang mendengarkan event ini
    const workflows = await this.prisma.workflowMaster.findMany({
      where: {
        company_id: payload.companyId,
        trigger_event: payload.eventName,
        status: true,
      },
      include: { nodes: true, edges: true },
    });

    if (workflows.length === 0) {
      this.logger.log(
        `No active workflows found for event: ${payload.eventName}`,
      );
      return;
    }

    // 2. Eksekusi Workflow
    for (const workflow of workflows) {
      await this.executeWorkflow(workflow, payload);
    }
  }

  /**
   * Engine utama yang mengeksekusi urutan Edge & Node
   */
  private async executeWorkflow(workflow: any, payload: WorkflowEventPayload) {
    // Cari node "Start"
    const startNode = workflow.nodes.find((n) => n.node_type === 'Start');
    if (!startNode) return;

    let currentNode = startNode;

    // Looping Node Traversing
    while (currentNode) {
      // Catat ke Log (Opsional, untuk debug)
      await this.prisma.automationLog.create({
        data: {
          company_id: payload.companyId,
          workflow_master_id: workflow.id,
          event_name: `Executing Node: ${currentNode.node_name}`,
          status: 'SUCCESS',
        },
      });

      switch (currentNode.node_type) {
        case 'Condition':
          // Evaluasi Rule Engine dari config JSON (Misal: config.amount > 50000000)
          const conditionPassed = this.evaluateCondition(
            currentNode.config,
            payload.data,
          );
          currentNode = this.getNextNode(
            workflow,
            currentNode.id,
            conditionPassed ? 'True' : 'False',
          );
          break;

        case 'Approval':
          // Buat Approval Request Dinamis
          await this.createDynamicApproval(currentNode, payload);
          // Berhenti di sini, biarkan Approval Endpoint yang men-trigger node selanjutnya
          currentNode = null;
          break;

        case 'Notification':
        case 'Task':
          await this.executeAction(currentNode, payload);
          currentNode = this.getNextNode(workflow, currentNode.id);
          break;

        case 'End':
          currentNode = null;
          break;

        default:
          currentNode = this.getNextNode(workflow, currentNode.id);
          break;
      }
    }
  }

  private evaluateCondition(config: any, data: any): boolean {
    // Placeholder untuk rule engine: membandingkan config (kriteria) vs data (transaksi)
    // Contoh sederhana:
    if (config.field && config.operator && config.value) {
      const actualValue = data[config.field];
      if (config.operator === 'GREATER_THAN') return actualValue > config.value;
      if (config.operator === 'LESS_THAN') return actualValue < config.value;
      if (config.operator === 'EQUALS') return actualValue === config.value;
    }
    return false;
  }

  private getNextNode(workflow: any, currentNodeId: string, label?: string) {
    let edge;
    if (label) {
      edge = workflow.edges.find(
        (e) =>
          e.source_node_id === currentNodeId && e.condition_label === label,
      );
    } else {
      edge = workflow.edges.find((e) => e.source_node_id === currentNodeId);
    }

    if (edge) {
      return workflow.nodes.find((n) => n.id === edge.target_node_id);
    }
    return null;
  }

  /**
   * Routing Dynamic Approval
   */
  private async createDynamicApproval(
    node: any,
    payload: WorkflowEventPayload,
  ) {
    const config = node.config as any; // Berisi role/user target

    await this.prisma.approvalRequest.create({
      data: {
        company_id: payload.companyId,
        module: payload.module,
        reference_id: payload.referenceId,
        title: `Approval Required: ${payload.eventName}`,
        status: 'PENDING',
        assigned_role: config.targetRole || null,
        assigned_user: config.targetUser || null,
      },
    });

    // Kirim Internal Inbox ke assignee
    if (config.targetUser) {
      await this.prisma.internalInbox.create({
        data: {
          company_id: payload.companyId,
          user_id: config.targetUser,
          message_type: 'Approval',
          title: 'New Approval Request',
          content: `You have a new pending approval for ${payload.referenceId}.`,
        },
      });
    }
  }

  /**
   * Action Engine (Email, Task, Reminder)
   */
  private async executeAction(node: any, payload: WorkflowEventPayload) {
    if (node.node_type === 'Task') {
      const config = node.config as any;
      await this.prisma.userTask.create({
        data: {
          company_id: payload.companyId,
          assigned_to: config.assignee, // (Bisa dinamis dari payload)
          title: config.taskTitle || 'Automated Task',
          status: 'TODO',
          priority: 'HIGH',
          reference_id: payload.referenceId,
        },
      });
    }
    // Implementasi Notifikasi Webhook/Email/WA akan dipush ke Queue di sini
  }
}
