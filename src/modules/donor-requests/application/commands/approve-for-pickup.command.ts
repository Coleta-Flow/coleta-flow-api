export class ApproveForPickupCommand {
  constructor(
    public readonly requestId: string,
    public readonly operatorId: string,
  ) {}
}
