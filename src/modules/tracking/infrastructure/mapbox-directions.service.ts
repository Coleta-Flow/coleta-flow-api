import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface RouteCoordinate {
  lat: number;
  lng: number;
}

/**
 * Calcula o trajeto real (por vias) via Mapbox Directions API — chamado uma
 * única vez no backend e distribuído por WebSocket, em vez de cada cliente
 * (app do motorista + console web) chamar a Mapbox por conta própria.
 */
@Injectable()
export class MapboxDirectionsService {
  private readonly logger = new Logger(MapboxDirectionsService.name);

  constructor(private readonly config: ConfigService) {}

  async getRoute(
    originLat: number,
    originLng: number,
    destinationLat: number,
    destinationLng: number,
  ): Promise<RouteCoordinate[]> {
    const token = this.config.get<string>('MAPBOX_TOKEN');
    if (!token) return [];

    const coordinates = `${originLng},${originLat};${destinationLng},${destinationLat}`;
    const url =
      `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}` +
      `?geometries=geojson&overview=full&access_token=${token}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        this.logger.warn(`Mapbox Directions retornou ${response.status}`);
        return [];
      }
      const data = await response.json();
      const geometry: number[][] | undefined = data?.routes?.[0]?.geometry?.coordinates;
      if (!geometry) return [];

      // Mapbox devolve [lng, lat] por ponto
      return geometry.map(([lng, lat]) => ({ lat, lng }));
    } catch (error) {
      this.logger.warn(`Falha ao buscar rota no Mapbox: ${(error as Error).message}`);
      return [];
    }
  }
}
