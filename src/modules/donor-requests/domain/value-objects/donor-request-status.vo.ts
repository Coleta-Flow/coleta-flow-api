import { DonorRequestStatus } from '@prisma/client';
import { InvalidStatusTransitionError } from '../../../../common/errors/domain.errors';

const VALID_TRANSITIONS: Partial<Record<DonorRequestStatus, DonorRequestStatus[]>> = {
  REQUESTED: [DonorRequestStatus.UNDER_REVIEW, DonorRequestStatus.CANCELLED],
  UNDER_REVIEW: [
    DonorRequestStatus.DIRECTED_TO_COLLECTION_POINT,
    DonorRequestStatus.APPROVED_FOR_PICKUP,
    DonorRequestStatus.CANCELLED,
  ],
  DIRECTED_TO_COLLECTION_POINT: [
    DonorRequestStatus.WAITING_DROPOFF_AT_POINT,
    DonorRequestStatus.CANCELLED,
  ],
  WAITING_DROPOFF_AT_POINT: [
    DonorRequestStatus.DELIVERED_TO_COLLECTION_POINT,
    DonorRequestStatus.CANCELLED,
  ],
  APPROVED_FOR_PICKUP: [DonorRequestStatus.DRIVER_ASSIGNED, DonorRequestStatus.CANCELLED],
  DRIVER_ASSIGNED: [DonorRequestStatus.DRIVER_ON_THE_WAY, DonorRequestStatus.CANCELLED],
  DRIVER_ON_THE_WAY: [DonorRequestStatus.DRIVER_ARRIVED, DonorRequestStatus.CANCELLED],
  DRIVER_ARRIVED: [DonorRequestStatus.COLLECTED, DonorRequestStatus.CANCELLED],
  COLLECTED: [DonorRequestStatus.GOING_TO_COLLECTION_POINT],
  GOING_TO_COLLECTION_POINT: [DonorRequestStatus.DELIVERED_TO_COLLECTION_POINT],
  DELIVERED_TO_COLLECTION_POINT: [DonorRequestStatus.WEIGHED],
  // Pickup flow → DECLARATION_AVAILABLE; Direct-to-point flow → FINISHED directly
  WEIGHED: [DonorRequestStatus.DECLARATION_AVAILABLE, DonorRequestStatus.FINISHED],
  DECLARATION_AVAILABLE: [DonorRequestStatus.FINISHED],
};

export class DonorRequestStatusVO {
  constructor(private readonly value: DonorRequestStatus) {}

  get current(): DonorRequestStatus {
    return this.value;
  }

  canTransitionTo(next: DonorRequestStatus): boolean {
    return VALID_TRANSITIONS[this.value]?.includes(next) ?? false;
  }

  transitionTo(next: DonorRequestStatus): DonorRequestStatusVO {
    if (!this.canTransitionTo(next)) {
      throw new InvalidStatusTransitionError(this.value, next);
    }
    return new DonorRequestStatusVO(next);
  }
}
