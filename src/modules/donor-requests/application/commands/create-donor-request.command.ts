export class CreateDonorRequestCommand {
  constructor(
    public readonly donorName: string,
    public readonly donorWhatsapp: string,
    public readonly donorEmail: string | undefined,
    public readonly address: string,
    public readonly city: string,
    public readonly materialTypeId: string,
    public readonly description: string,
    public readonly estimatedWeightKg: number | undefined,
    public readonly bestTimeForPickup: string,
    public readonly photoUrls: string[],
  ) {}
}
