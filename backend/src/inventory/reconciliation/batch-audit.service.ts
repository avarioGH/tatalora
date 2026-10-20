import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { normalizeBatch } from '../utils/batch.util';
import { ReservationReconciliationService } from './reservation-reconciliation.service';

@Injectable()
export class BatchAuditService {
  constructor(
    private prisma: PrismaService,
    private reservationService: ReservationReconciliationService,
  ) {}

  private async fetchInChunks(
    delegate: any,
    where: any,
    select: any,
    processFn: (chunk: any[]) => void,
  ) {
    let skip = 0;
    const take = 100;
    while (true) {
      const chunk = await delegate.findMany({
        where,
        select,
        skip,
        take,
        orderBy: { id: 'asc' },
      });
      if (chunk.length === 0) break;
      processFn(chunk);
      if (chunk.length < take) break;
      skip += take;
    }
  }

  private async buildAuditMap(companyId: string) {
    const canonicalMap = new Map<
      string,
      { exactBatches: Set<string>; workflows: Map<string, Set<string>> }
    >();
    const identityRiskMap = new Map<string, Set<string>>();
    let totalAuditedRecords = 0;

    const track = (
      workflow: string,
      canonical: string,
      exact: string,
      locationId?: string,
      variantId?: string,
    ) => {
      totalAuditedRecords++;
      if (!canonicalMap.has(canonical))
        canonicalMap.set(canonical, {
          exactBatches: new Set(),
          workflows: new Map(),
        });
      const entry = canonicalMap.get(canonical)!;
      entry.exactBatches.add(exact);

      if (!entry.workflows.has(workflow))
        entry.workflows.set(workflow, new Set());
      entry.workflows.get(workflow)!.add(exact);

      if (workflow === 'STOCK' && locationId && variantId) {
        const identityKey = locationId + '_' + variantId + '_' + canonical;
        if (!identityRiskMap.has(identityKey))
          identityRiskMap.set(identityKey, new Set());
        identityRiskMap.get(identityKey)!.add(exact);
      }
    };

    // Maps for Integrity Audit
    const stockMap = new Map<
      string,
      {
        physicalPcs: number;
        physicalM3: number;
        ledgerPcs: number;
        ledgerM3: number;
      }
    >();
    const shipmentMap = new Map<string, { qty: number; hasLedger: boolean }>();
    const ledgerShipmentSet = new Set<string>();

    const getStockKey = (loc: string, v: string, eb: string) =>
      loc + '_' + v + '_' + eb;

    try {
      await this.fetchInChunks(
        this.prisma.timberStock,
        { location: { company_id: companyId } },
        {
          id: true,
          batch: true,
          locationId: true,
          timberVariantId: true,
          currentPcs: true,
          currentVolumeM3: true,
        },
        (chunk) => {
          for (const r of chunk) {
            const exact = r.batch || 'UNKNOWN';
            track(
              'STOCK',
              normalizeBatch(exact),
              exact,
              r.locationId,
              r.timberVariantId,
            );

            const key = getStockKey(r.locationId, r.timberVariantId, exact);
            if (!stockMap.has(key))
              stockMap.set(key, {
                physicalPcs: 0,
                physicalM3: 0,
                ledgerPcs: 0,
                ledgerM3: 0,
              });
            const sm = stockMap.get(key)!;
            sm.physicalPcs += r.currentPcs;
            sm.physicalM3 += r.currentVolumeM3;
          }
        },
      );

      await this.fetchInChunks(
        this.prisma.timberStockMovement,
        { location: { company_id: companyId } },
        {
          id: true,
          batch: true,
          locationId: true,
          timberVariantId: true,
          type: true,
          referenceType: true,
          referenceId: true,
          quantityPcs: true,
          quantityM3: true,
        },
        (chunk) => {
          for (const r of chunk) {
            const exact = r.batch || 'UNKNOWN';
            track('MOVEMENT', normalizeBatch(exact), exact);

            const isDecreasing =
              r.type === 'OUT' ||
              (r.type === 'ADJ' &&
                (r.referenceType === 'ADJUSTMENT_OUT' ||
                  r.referenceType === 'REVERSAL'));
            const key = getStockKey(r.locationId, r.timberVariantId, exact);

            if (!stockMap.has(key))
              stockMap.set(key, {
                physicalPcs: 0,
                physicalM3: 0,
                ledgerPcs: 0,
                ledgerM3: 0,
              });
            const sm = stockMap.get(key)!;
            sm.ledgerPcs += isDecreasing ? -r.quantityPcs : r.quantityPcs;
            sm.ledgerM3 += isDecreasing ? -r.quantityM3 : r.quantityM3;

            if (
              r.type === 'OUT' &&
              r.referenceType === 'TIMBER_SHIPMENT' &&
              r.referenceId
            ) {
              ledgerShipmentSet.add(r.referenceId);
            }
          }
        },
      );

      await this.fetchInChunks(
        this.prisma.timberShipmentItem,
        { shipment: { company_id: companyId } },
        { id: true, batch: true, shipmentId: true },
        (chunk) => {
          for (const r of chunk) {
            track(
              'SHIPMENT',
              normalizeBatch(r.batch || 'UNKNOWN'),
              r.batch || 'UNKNOWN',
            );
            shipmentMap.set(r.id, { qty: 1, hasLedger: false }); // Track item
          }
        },
      );

      // Update shipmentMap hasLedger
      for (const id of ledgerShipmentSet) {
        if (shipmentMap.has(id)) {
          shipmentMap.get(id)!.hasLedger = true;
        }
      }

      await this.fetchInChunks(
        this.prisma.timberPurchaseItem,
        { purchase: { company_id: companyId } },
        { id: true, batch: true },
        (chunk) => {
          for (const r of chunk)
            track(
              'PURCHASE',
              normalizeBatch(r.batch || 'UNKNOWN'),
              r.batch || 'UNKNOWN',
            );
        },
      );
      await this.fetchInChunks(
        this.prisma.stockTransferItem,
        { transfer: { fromLocation: { company_id: companyId } } },
        { id: true, batch: true },
        (chunk) => {
          for (const r of chunk)
            track(
              'TRANSFER',
              normalizeBatch(r.batch || 'UNKNOWN'),
              r.batch || 'UNKNOWN',
            );
        },
      );
      await this.fetchInChunks(
        this.prisma.stockAdjustmentItem,
        { adjustment: { location: { company_id: companyId } } },
        { id: true, batch: true },
        (chunk) => {
          for (const r of chunk)
            track(
              'ADJUSTMENT',
              normalizeBatch(r.batch || 'UNKNOWN'),
              r.batch || 'UNKNOWN',
            );
        },
      );
      await this.fetchInChunks(
        this.prisma.timberStockOpnameItem,
        { opname: { company_id: companyId } },
        { id: true, batch: true },
        (chunk) => {
          for (const r of chunk)
            track(
              'OPNAME',
              normalizeBatch(r.batch || 'UNKNOWN'),
              r.batch || 'UNKNOWN',
            );
        },
      );
      await this.fetchInChunks(
        this.prisma.productionProcessOutput,
        { process: { company_id: companyId } },
        { id: true, batch: true },
        (chunk) => {
          for (const r of chunk)
            track(
              'SEC_PRODUCTION',
              normalizeBatch(r.batch || 'UNKNOWN'),
              r.batch || 'UNKNOWN',
            );
        },
      );
      await this.fetchInChunks(
        this.prisma.sawnTimberOutput,
        { location: { company_id: companyId } },
        { id: true, batch: true },
        (chunk) => {
          for (const r of chunk)
            track(
              'SAWMILL',
              normalizeBatch(r.batch || 'UNKNOWN'),
              r.batch || 'UNKNOWN',
            );
        },
      );
    } catch (err) {
      throw new Error('DATA_UNAVAILABLE');
    }

    return {
      canonicalMap,
      identityRiskMap,
      stockMap,
      shipmentMap,
      ledgerShipmentSet,
      totalAuditedRecords,
    };
  }

  async getSummary(companyId: string) {
    const {
      canonicalMap,
      identityRiskMap,
      stockMap,
      shipmentMap,
      ledgerShipmentSet,
      totalAuditedRecords,
    } = await this.buildAuditMap(companyId);

    let normalCount = 0;
    let formatVariantCount = 0;
    let unknownCount = 0;
    let canonicalCollisionCount = 0;
    let crossWorkflowFormatVariantCount = 0;
    let crossWorkflowCanonicalUsageCount = 0;

    for (const [canonical, data] of canonicalMap.entries()) {
      if (canonical === 'UNKNOWN') {
        unknownCount++;
        continue;
      }
      if (data.exactBatches.size > 1) {
        canonicalCollisionCount++;
      } else {
        const exact = Array.from(data.exactBatches)[0];
        if (exact !== canonical) formatVariantCount++;
        else normalCount++;
      }
      if (data.workflows.size > 1) {
        crossWorkflowCanonicalUsageCount++;
        let formats = 0;
        for (const w of data.workflows.values()) formats += w.size;
        if (formats > data.workflows.size) {
          crossWorkflowFormatVariantCount++;
        } else {
          const set = new Set();
          for (const w of data.workflows.values()) set.add(Array.from(w)[0]);
          if (set.size > 1) crossWorkflowFormatVariantCount++;
        }
      }
    }

    let stockIdentityRiskCount = 0;
    for (const exactSet of identityRiskMap.values()) {
      if (exactSet.size > 1) stockIdentityRiskCount++;
    }

    // Integrity Metrics
    let stockLedgerMatchCount = 0;
    let stockLedgerMismatchCount = 0;
    let noLedgerHistoryCount = 0;
    let ledgerWithoutStockCount = 0;

    for (const sm of stockMap.values()) {
      if (sm.physicalPcs === 0 && sm.ledgerPcs > 0) {
        ledgerWithoutStockCount++;
      } else if (sm.physicalPcs > 0 && sm.ledgerPcs === 0) {
        noLedgerHistoryCount++;
      } else if (sm.physicalPcs === sm.ledgerPcs) {
        stockLedgerMatchCount++;
      } else {
        stockLedgerMismatchCount++;
      }
    }

    let shipmentLedgerMatchCount = 0;
    let shipmentWithoutLedgerCount = 0;
    for (const ship of shipmentMap.values()) {
      if (ship.hasLedger) shipmentLedgerMatchCount++;
      else shipmentWithoutLedgerCount++;
    }

    let ledgerWithoutShipmentCount = 0;
    for (const led of ledgerShipmentSet) {
      if (!shipmentMap.has(led)) ledgerWithoutShipmentCount++;
    }

    // Reservation Re-Use
    let reservationHealthyCount = 0;
    let reservationOverCount = 0;
    let reservationNegativeAvailableCount = 0;
    let reservationOrphanCount = 0;
    let salesOrderReservationMatchCount = 0;
    let salesOrderReservationUnderCount = 0;
    let salesOrderReservationOverCount = 0;
    let legacyOpenOrderNoWarehouseCount = 0;

    try {
      const resAudit = await this.reservationService.reconcile({ companyId });
      for (const row of resAudit) {
        if (row.statusFlags.includes('HEALTHY')) reservationHealthyCount++;
        if (row.statusFlags.includes('OVER_RESERVED')) reservationOverCount++;
        if (row.statusFlags.includes('NEGATIVE_AVAILABLE'))
          reservationNegativeAvailableCount++;
        if (row.statusFlags.includes('ORPHAN_RESERVATION'))
          reservationOrphanCount++;
        if (row.statusFlags.includes('LEGACY_OPEN_ORDER_NO_WAREHOUSE'))
          legacyOpenOrderNoWarehouseCount++;

        if (row.reservationPcsDelta === 0) salesOrderReservationMatchCount++;
        else if (row.reservationPcsDelta > 0) salesOrderReservationOverCount++;
        else salesOrderReservationUnderCount++;
      }
    } catch (e) {
      // Ignore if reservation service fails, but it shouldn't
    }

    return {
      totalAuditedRecords,
      normalCount,
      formatVariantCount,
      unknownCount,
      canonicalCollisionCount,
      stockIdentityRiskCount,
      crossWorkflowFormatVariantCount,
      crossWorkflowCanonicalUsageCount,
      criticalCount:
        stockLedgerMismatchCount +
        reservationOverCount +
        shipmentWithoutLedgerCount,
      auditStatus:
        stockLedgerMismatchCount > 0 || stockIdentityRiskCount > 0
          ? 'ANOMALIES'
          : 'HEALTHY',

      stockLedgerMatchCount,
      stockLedgerMismatchCount,
      noLedgerHistoryCount,
      ledgerWithoutStockCount,

      reservationHealthyCount,
      reservationOverCount,
      reservationNegativeAvailableCount,
      reservationOrphanCount,

      shipmentLedgerMatchCount,
      shipmentWithoutLedgerCount,
      ledgerWithoutShipmentCount,

      salesOrderReservationMatchCount,
      salesOrderReservationUnderCount,
      salesOrderReservationOverCount,
      legacyOpenOrderNoWarehouseCount,
    };
  }

  async getDrillDown(
    companyId: string,
    canonicalBatch: string,
    page: number = 1,
    limit: number = 50,
  ) {
    const { canonicalMap, identityRiskMap, stockMap } =
      await this.buildAuditMap(companyId);
    const data = canonicalMap.get(canonicalBatch);

    if (!data) {
      return {
        canonicalBatch,
        category: 'UNKNOWN',
        explanation: 'Batch not found in audit.',
        workflows: [],
        stockRecords: [],
        movementRecords: [],
        purchaseRecords: [],
        shipmentRecords: [],
        transferRecords: [],
        adjustmentRecords: [],
        opnameRecords: [],
        secProductionRecords: [],
        sawmillRecords: [],
        reservationRecords: [],
        page,
        limit,
      };
    }

    const exactBatches = Array.from(data.exactBatches);

    let category = 'NORMAL';
    let explanation = 'Batch is already stored in canonical form.';

    const identityRisks = new Set<string>();
    for (const [key, exactSet] of identityRiskMap.entries()) {
      if (exactSet.size > 1 && key.endsWith('_' + canonicalBatch)) {
        category = 'STOCK_IDENTITY_RISK';
        explanation =
          'Multiple persisted batch strings resolve to the same canonical batch within the same company, warehouse, and timber variant.';
      }
    }

    if (category === 'NORMAL') {
      if (canonicalBatch === 'UNKNOWN') {
        category = 'UNKNOWN';
        explanation =
          'Batch is empty or unavailable and is represented as UNKNOWN.';
      } else if (exactBatches.length > 1) {
        if (data.workflows.size > 1) {
          category = 'CROSS_WORKFLOW_FORMAT_VARIANT';
          explanation =
            'Different workflows use different persisted representations of the same canonical batch.';
        } else {
          category = 'CANONICAL_COLLISION';
          explanation =
            'Multiple persisted batch strings resolve to the same canonical representation.';
        }
      } else if (exactBatches[0] !== canonicalBatch) {
        category = 'FORMAT_VARIANT';
        explanation =
          'Stored batch differs from the canonical trim/uppercase representation.';
      } else if (data.workflows.size > 1) {
        category = 'CROSS_WORKFLOW_CANONICAL_USAGE';
        explanation =
          'The same canonical batch is referenced by multiple workflows.';
      }
    }

    const workflowSummary = Array.from(data.workflows.entries()).map(
      ([wf, eb]) => ({ workflow: wf, exactBatches: Array.from(eb) }),
    );
    const skip = (page - 1) * limit;
    const exactFilters = exactBatches.length > 0 ? exactBatches : [''];

    const mapExact = (record: any, batchField: string = 'batch') => ({
      ...record,
      exactBatch: record[batchField] || 'UNKNOWN',
      canonicalBatch,
    });

    const rawStock = await this.prisma.timberStock.findMany({
      where: {
        location: { company_id: companyId },
        batch: { in: exactFilters },
      },
      include: { location: true, timberVariant: true },
      skip,
      take: limit,
      orderBy: { id: 'asc' },
    });

    const stockRecords = rawStock.map((r: any) => {
      const sm = stockMap.get(
        r.locationId + '_' + r.timberVariantId + '_' + r.batch,
      );
      const classification = sm
        ? sm.physicalPcs === sm.ledgerPcs
          ? 'MATCH'
          : sm.ledgerPcs === 0
            ? 'NO_LEDGER_HISTORY'
            : 'STOCK_LEDGER_MISMATCH'
        : 'UNKNOWN';
      return {
        ...mapExact(r),
        ledgerNetPcs: sm?.ledgerPcs || 0,
        classification,
      };
    });

    const movementRecords = (
      await this.prisma.timberStockMovement.findMany({
        where: {
          timberStock: { location: { company_id: companyId } },
          batch: { in: exactFilters },
        },
        skip,
        take: limit,
        orderBy: { date: 'desc' },
      })
    ).map((r: any) => mapExact(r));
    const purchaseRecords = (
      await this.prisma.timberPurchaseItem.findMany({
        where: {
          timberPurchase: { company_id: companyId },
          batch: { in: exactFilters },
        },
        skip,
        take: limit,
        orderBy: { id: 'asc' },
      })
    ).map((r: any) => mapExact(r));
    const shipmentRecords = (
      await this.prisma.timberShipmentItem.findMany({
        where: {
          timberShipment: { company_id: companyId },
          batch: { in: exactFilters },
        },
        skip,
        take: limit,
        orderBy: { id: 'asc' },
      })
    ).map((r: any) => mapExact(r));
    const transferRecords = (
      await this.prisma.stockTransferItem.findMany({
        where: {
          transfer: { fromLocation: { company_id: companyId } },
          batch: { in: exactFilters },
        },
        skip,
        take: limit,
        orderBy: { id: 'asc' },
      })
    ).map((r: any) => mapExact(r));
    const adjustmentRecords = (
      await this.prisma.stockAdjustmentItem.findMany({
        where: {
          adjustment: { location: { company_id: companyId } },
          batch: { in: exactFilters },
        },
        skip,
        take: limit,
        orderBy: { id: 'asc' },
      })
    ).map((r: any) => mapExact(r));
    const opnameRecords = (
      await this.prisma.timberStockOpnameItem.findMany({
        where: {
          stockOpname: { company_id: companyId },
          batch: { in: exactFilters },
        },
        skip,
        take: limit,
        orderBy: { id: 'asc' },
      })
    ).map((r: any) => mapExact(r));
    const secProductionRecords: any[] = [];
    const sawmillRecords = (
      await this.prisma.sawnTimberOutput.findMany({
        where: {
          location: { company_id: companyId },
          batch: { in: exactFilters },
        },
        skip,
        take: limit,
        orderBy: { id: 'asc' },
      })
    ).map((r: any) => mapExact(r));

    // Reservation Context
    const reservationRecords: any[] = [];
    try {
      const resAudit = await this.reservationService.reconcile({ companyId });
      // Filter for variants matching this batch
      const variantIds = new Set(rawStock.map((r) => r.timberVariantId));
      for (const row of resAudit) {
        if (variantIds.has(row.timberVariantId)) {
          reservationRecords.push({
            note: 'Reservation is tracked at Variant + Warehouse level, not per batch.',
            locationId: row.locationId,
            timberVariantId: row.timberVariantId,
            physicalTotalPcs: row.physicalPcs,
            actualReservedPcs: row.actualReservedPcs,
            availablePcs: row.availablePcs,
            expectedReservedPcs: row.expectedReservedPcs,
            statusFlags: row.statusFlags,
          });
        }
      }
    } catch (e) {}

    return {
      canonicalBatch,
      category,
      explanation,
      workflows: workflowSummary,
      stockRecords,
      movementRecords,
      purchaseRecords,
      shipmentRecords,
      transferRecords,
      adjustmentRecords,
      opnameRecords,
      secProductionRecords,
      sawmillRecords,
      reservationRecords,
      page,
      limit,
    };
  }

  async getDetail(companyId: string, page: number = 1, limit: number = 50) {
    const { canonicalMap, identityRiskMap } =
      await this.buildAuditMap(companyId);
    const findings: any[] = [];
    const identityRisks = new Set<string>();
    for (const [key, exactSet] of identityRiskMap.entries())
      if (exactSet.size > 1) identityRisks.add(key.split('_')[2]);

    for (const [canonical, data] of canonicalMap.entries()) {
      let category = 'NORMAL',
        severity = 'INFO';
      const exactBatches = Array.from(data.exactBatches);

      if (identityRisks.has(canonical)) {
        category = 'STOCK_IDENTITY_RISK';
        severity = 'HIGH';
      } else if (canonical === 'UNKNOWN') {
        category = 'UNKNOWN';
        severity = 'INFO';
      } else if (exactBatches.length > 1) {
        if (data.workflows.size > 1) {
          category = 'CROSS_WORKFLOW_FORMAT_VARIANT';
          severity = 'MEDIUM';
        } else {
          category = 'CANONICAL_COLLISION';
          severity = 'LOW';
        }
      } else if (exactBatches[0] !== canonical) {
        category = 'FORMAT_VARIANT';
        severity = 'LOW';
      }

      findings.push({
        canonicalBatch: canonical,
        exactBatches,
        category,
        severity,
        workflows: Array.from(data.workflows.entries()).map(([wf, eb]) => ({
          workflow: wf,
          exactBatches: Array.from(eb),
        })),
      });
    }

    findings.sort((a, b) => a.canonicalBatch.localeCompare(b.canonicalBatch));
    const total = findings.length;
    const startIndex = (page - 1) * limit;
    return {
      findings: findings.slice(startIndex, startIndex + limit),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
