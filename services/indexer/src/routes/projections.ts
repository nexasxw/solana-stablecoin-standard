import type {
  HolderBalanceProjection,
  IndexerRepository,
  IndexerStablecoinProjectionState,
} from "../store/indexer-repository";

export interface ProjectionQuery {
  tenant_id: string;
  stablecoin_id: string;
}

export interface TenantRequestContext {
  tenant_id: string;
  request_id: string;
}

export interface ProjectionRouteResponse<T> {
  request_id: string;
  tenant_id: string;
  data: T;
}

export class ProjectionRouteHandlers {
  constructor(private readonly repository: IndexerRepository) {}

  getStablecoinProjection(
    context: TenantRequestContext,
    query: ProjectionQuery
  ): ProjectionRouteResponse<IndexerStablecoinProjectionState | null> {
    if (context.tenant_id !== query.tenant_id) {
      throw new Error("Tenant scope mismatch");
    }

    const projection = this.repository.getStablecoinProjection(query.tenant_id, query.stablecoin_id);
    return {
      request_id: context.request_id,
      tenant_id: query.tenant_id,
      data: projection,
    };
  }

  getHolderBalances(
    context: TenantRequestContext,
    query: ProjectionQuery
  ): ProjectionRouteResponse<HolderBalanceProjection[]> {
    if (context.tenant_id !== query.tenant_id) {
      throw new Error("Tenant scope mismatch");
    }

    const balances = this.repository.listHolderBalances(query.tenant_id, query.stablecoin_id);
    return {
      request_id: context.request_id,
      tenant_id: query.tenant_id,
      data: balances,
    };
  }
}
