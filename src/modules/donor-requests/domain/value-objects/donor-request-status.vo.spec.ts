import { DonorRequestStatus } from '@prisma/client';
import { DonorRequestStatusVO } from './donor-request-status.vo';
import { InvalidStatusTransitionError } from '../../../../common/errors/domain.errors';

describe('DonorRequestStatusVO', () => {
  it('should allow valid transition from REQUESTED to UNDER_REVIEW', () => {
    const status = new DonorRequestStatusVO(DonorRequestStatus.REQUESTED);
    const next = status.transitionTo(DonorRequestStatus.UNDER_REVIEW);
    expect(next.current).toBe(DonorRequestStatus.UNDER_REVIEW);
  });

  it('should allow CANCELLED from any non-terminal status', () => {
    const reviewStatus = new DonorRequestStatusVO(DonorRequestStatus.UNDER_REVIEW);
    expect(reviewStatus.canTransitionTo(DonorRequestStatus.CANCELLED)).toBe(true);
  });

  it('should throw InvalidStatusTransitionError on invalid transition', () => {
    const status = new DonorRequestStatusVO(DonorRequestStatus.REQUESTED);
    expect(() => status.transitionTo(DonorRequestStatus.FINISHED)).toThrow(
      InvalidStatusTransitionError,
    );
  });

  it('should not allow transition from FINISHED', () => {
    const status = new DonorRequestStatusVO(DonorRequestStatus.FINISHED);
    expect(status.canTransitionTo(DonorRequestStatus.CANCELLED)).toBe(false);
  });

  it('should follow the collection point path correctly', () => {
    const s1 = new DonorRequestStatusVO(DonorRequestStatus.UNDER_REVIEW);
    const s2 = s1.transitionTo(DonorRequestStatus.DIRECTED_TO_COLLECTION_POINT);
    const s3 = s2.transitionTo(DonorRequestStatus.WAITING_DROPOFF_AT_POINT);
    const s4 = s3.transitionTo(DonorRequestStatus.DELIVERED_TO_COLLECTION_POINT);
    expect(s4.current).toBe(DonorRequestStatus.DELIVERED_TO_COLLECTION_POINT);
  });

  it('should follow the pickup path correctly', () => {
    const s1 = new DonorRequestStatusVO(DonorRequestStatus.UNDER_REVIEW);
    const s2 = s1.transitionTo(DonorRequestStatus.APPROVED_FOR_PICKUP);
    const s3 = s2.transitionTo(DonorRequestStatus.DRIVER_ASSIGNED);
    const s4 = s3.transitionTo(DonorRequestStatus.DRIVER_ON_THE_WAY);
    expect(s4.current).toBe(DonorRequestStatus.DRIVER_ON_THE_WAY);
  });

  it('pickup flow: WEIGHED should transition to DECLARATION_AVAILABLE', () => {
    const status = new DonorRequestStatusVO(DonorRequestStatus.WEIGHED);
    const next = status.transitionTo(DonorRequestStatus.DECLARATION_AVAILABLE);
    expect(next.current).toBe(DonorRequestStatus.DECLARATION_AVAILABLE);
  });

  it('direct-to-point flow: WEIGHED should transition directly to FINISHED (no declaration)', () => {
    const status = new DonorRequestStatusVO(DonorRequestStatus.WEIGHED);
    const next = status.transitionTo(DonorRequestStatus.FINISHED);
    expect(next.current).toBe(DonorRequestStatus.FINISHED);
  });
});
