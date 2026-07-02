export class ListDonorRequestsQuery {
  constructor(
    public readonly status?: string,
    public readonly city?: string,
    public readonly startDate?: string,
    public readonly endDate?: string,
    public readonly page: number = 1,
    public readonly limit: number = 20,
  ) {}
}
