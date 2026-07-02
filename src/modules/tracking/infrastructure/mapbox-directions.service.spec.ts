import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MapboxDirectionsService } from './mapbox-directions.service';

const mockConfig = { get: jest.fn() };

describe('MapboxDirectionsService', () => {
  let service: MapboxDirectionsService;
  let fetchSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MapboxDirectionsService, { provide: ConfigService, useValue: mockConfig }],
    }).compile();

    service = module.get<MapboxDirectionsService>(MapboxDirectionsService);
    jest.clearAllMocks();
    fetchSpy = jest.spyOn(global, 'fetch' as any);
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('returns an empty array when no Mapbox token is configured', async () => {
    mockConfig.get.mockReturnValue(undefined);

    const result = await service.getRoute(-3.73, -38.52, -3.75, -38.55);

    expect(result).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('parses coordinates from the Mapbox Directions response', async () => {
    mockConfig.get.mockReturnValue('fake-token');
    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({
        routes: [{ geometry: { coordinates: [[-38.52, -3.73], [-38.53, -3.74]] } }],
      }),
    } as Response);

    const result = await service.getRoute(-3.73, -38.52, -3.75, -38.55);

    expect(result).toEqual([
      { lat: -3.73, lng: -38.52 },
      { lat: -3.74, lng: -38.53 },
    ]);
  });

  it('returns an empty array when the response has no routes', async () => {
    mockConfig.get.mockReturnValue('fake-token');
    fetchSpy.mockResolvedValue({ ok: true, json: async () => ({ routes: [] }) } as Response);

    const result = await service.getRoute(-3.73, -38.52, -3.75, -38.55);

    expect(result).toEqual([]);
  });

  it('returns an empty array when the request fails', async () => {
    mockConfig.get.mockReturnValue('fake-token');
    fetchSpy.mockResolvedValue({ ok: false, status: 500 } as Response);

    const result = await service.getRoute(-3.73, -38.52, -3.75, -38.55);

    expect(result).toEqual([]);
  });

  it('returns an empty array when fetch throws', async () => {
    mockConfig.get.mockReturnValue('fake-token');
    fetchSpy.mockRejectedValue(new Error('network error'));

    const result = await service.getRoute(-3.73, -38.52, -3.75, -38.55);

    expect(result).toEqual([]);
  });
});
