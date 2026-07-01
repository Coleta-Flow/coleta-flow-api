export class UpdateDonorRequestCommand {
  constructor(
    public readonly requestId: string,
    public readonly description?: string,
    public readonly estimatedWeightKg?: number,
    public readonly bestTimeForPickup?: string,
    public readonly operatorNotes?: string,
  ) {}
}
