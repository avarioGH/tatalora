import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface ReconciliationRow {
  companyId: string;
  locationId: string | null;
  timberVariantId: string;

  physicalPcs: number;
  physicalM3: number;

  expectedReservedPcs: number;
  actualReservedPcs: number;

  expectedReservedM3: number;
  actualReservedM3: number;

  availablePcs: number;
  availableM3: number;

  reservationPcsDelta: number;
  reservationM3Delta: number;

  statusFlags: string[];

  openOrders?: any[];
  stockBatches?: any[];
}

@Injectable()
export class ReservationReconciliationService {
  constructor(private prisma: PrismaService) {}

  async reconcile(filters?: {
    companyId?: string;
    locationId?: string | null;
    timberVariantId?: string;
    status?: string;
  }) {
    const stockWhere: any = {};
    if (filters?.locationId) stockWhere.locationId = filters.locationId;
    if (filters?.timberVariantId)
      stockWhere.timberVariantId = filters.timberVariantId;

    const allStock = await this.prisma.timberStock.findMany({
      where: stockWhere,
      include: { location: true },
    });

    const resWhere: any = {};
    if (filters?.companyId) resWhere.company_id = filters.companyId;
    if (filters?.locationId) resWhere.locationId = filters.locationId;
    if (filters?.timberVariantId)
      resWhere.timberVariantId = filters.timberVariantId;

    const allReservations = await this.prisma.timberStockReservation.findMany({
      where: resWhere,
    });

    const soWhere: any = {
      salesOrder: {
        status: {
          in: ['CONFIRMED', 'PARTIALLY_FULFILLED', 'CANCELLED', 'DRAFT'],
        },
      },
    };
    if (filters?.companyId)
      soWhere.salesOrder = {
        ...soWhere.salesOrder,
        customer: { company_id: filters.companyId },
      };
    if (filters?.locationId) soWhere.fulfillmentLocationId = filters.locationId;
    if (filters?.timberVariantId)
      soWhere.timberVariantId = filters.timberVariantId;

    const openSoItems = await this.prisma.timberSalesOrderItem.findMany({
      where: soWhere,
      include: {
        salesOrder: { include: { customer: true } },
      },
    });

    const map = new Map<string, any>();

    const getKey = (
      companyId: string,
      locationId: string | null,
      variantId: string,
    ) => companyId + '|' + (locationId || 'NULL') + '|' + variantId;

    const getOrInit = (
      companyId: string,
      locationId: string | null,
      variantId: string,
    ) => {
      const key = getKey(companyId, locationId, variantId);
      if (!map.has(key)) {
        map.set(key, {
          companyId,
          locationId,
          timberVariantId: variantId,
          physicalPcs: 0,
          physicalM3: 0,
          expectedReservedPcs: 0,
          expectedReservedM3: 0,
          actualReservedPcs: 0,
          actualReservedM3: 0,
          openOrders: [],
          stockBatches: [],
        });
      }
      return map.get(key);
    };

    for (const stock of allStock) {
      const companyId = stock.location.company_id;
      if (filters?.companyId && companyId !== filters.companyId) continue;

      const entry = getOrInit(
        companyId,
        stock.locationId,
        stock.timberVariantId,
      );
      entry.physicalPcs += stock.currentPcs;
      entry.physicalM3 += stock.currentVolumeM3;
      entry.stockBatches.push({
        batch: stock.batch,
        pcs: stock.currentPcs,
        m3: stock.currentVolumeM3,
      });
    }

    for (const res of allReservations) {
      const entry = getOrInit(
        res.company_id,
        res.locationId,
        res.timberVariantId,
      );
      entry.actualReservedPcs += res.reservedPcs;
      entry.actualReservedM3 += res.reservedM3;
    }

    for (const item of openSoItems) {
      const companyId = item.salesOrder.customer.company_id;
      const locationId = item.fulfillmentLocationId;
      const variantId = item.timberVariantId || 'UNKNOWN';

      const remainingPcs = Math.max(0, item.orderQty - item.realizedQty);
      const remainingM3 = Math.max(0, item.orderM3 - item.realizedM3);

      const entry = getOrInit(companyId, locationId, variantId);

      entry.openOrders.push({
        soId: item.salesOrder.id,
        soNumber: item.salesOrder.orderNumber,
        status: item.salesOrder.status,
        remainingPcs,
        remainingM3,
      });

      if (
        ['CONFIRMED', 'PARTIALLY_FULFILLED'].includes(item.salesOrder.status)
      ) {
        if (remainingPcs > 0 || remainingM3 > 0) {
          entry.expectedReservedPcs += remainingPcs;
          entry.expectedReservedM3 += remainingM3;
        }
      }
    }

    const results: ReconciliationRow[] = [];
    const EPSILON = 0.0001;

    for (const entry of map.values()) {
      const {
        companyId,
        locationId,
        timberVariantId,
        physicalPcs,
        physicalM3,
        expectedReservedPcs,
        expectedReservedM3,
        actualReservedPcs,
        actualReservedM3,
        openOrders,
        stockBatches,
      } = entry;

      const availablePcs = physicalPcs - actualReservedPcs;
      const availableM3 = physicalM3 - actualReservedM3;

      const reservationPcsDelta = actualReservedPcs - expectedReservedPcs;
      const reservationM3Delta = actualReservedM3 - expectedReservedM3;

      const flags: string[] = [];
      const anomalies: string[] = [];

      let hasDraft = false;
      let hasCancelled = false;
      for (const o of openOrders) {
        if (o.status === 'DRAFT') hasDraft = true;
        if (o.status === 'CANCELLED' && o.remainingPcs > 0) hasCancelled = true;
      }

      if (reservationPcsDelta === 0 && Math.abs(reservationM3Delta) < EPSILON) {
        if (expectedReservedPcs === 0 && actualReservedPcs === 0) {
          // Empty match
        } else {
          flags.push('MATCH');
        }
      }

      if (reservationPcsDelta > 0 || reservationM3Delta > EPSILON) {
        if (expectedReservedPcs === 0 && expectedReservedM3 === 0) {
          anomalies.push('ORPHAN_RESERVATION');
        } else {
          anomalies.push('OVER_RESERVED');
        }
        anomalies.push('RESERVATION_DRIFT');
      }

      if (reservationPcsDelta < 0 || reservationM3Delta < -EPSILON) {
        if (
          actualReservedPcs === 0 &&
          actualReservedM3 === 0 &&
          expectedReservedPcs > 0
        ) {
          anomalies.push('LEGACY_UNRESERVED');
        } else {
          anomalies.push('UNDER_RESERVED');
        }
        anomalies.push('RESERVATION_DRIFT');
      }

      if (availablePcs < 0 || availableM3 < -EPSILON) {
        anomalies.push('NEGATIVE_AVAILABLE');
      }

      if (locationId === null && expectedReservedPcs > 0) {
        anomalies.push('LEGACY_OPEN_ORDER_NO_WAREHOUSE');
      }

      if (hasDraft && actualReservedPcs > 0) {
        anomalies.push('INVALID_DRAFT_RESERVATION');
      }

      flags.push(...anomalies);

      if (anomalies.length === 0) {
        flags.push('HEALTHY');
      }

      if (filters?.status && !flags.includes(filters.status)) {
        continue;
      }

      results.push({
        companyId,
        locationId,
        timberVariantId,
        physicalPcs,
        physicalM3,
        expectedReservedPcs,
        actualReservedPcs,
        expectedReservedM3,
        actualReservedM3,
        availablePcs,
        availableM3,
        reservationPcsDelta,
        reservationM3Delta,
        statusFlags: flags,
        openOrders,
        stockBatches,
      });
    }

    return results;
  }
}
