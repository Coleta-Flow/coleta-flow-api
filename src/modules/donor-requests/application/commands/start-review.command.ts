export class StartReviewCommand {
  constructor(
    public readonly requestId: string,
    public readonly operatorId: string,
  ) {}
}
