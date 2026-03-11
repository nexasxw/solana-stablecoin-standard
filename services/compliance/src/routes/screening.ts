import {
  createErrorEnvelope,
  createSuccessEnvelope,
  type ApiEnvelope,
} from "../../../shared/dist/contracts/envelope";
import { parseServiceIdentity, requireIssuerAuthorization } from "../../../shared/dist/auth/service-auth";
import { toStableError } from "../../../shared/dist/contracts/errors";
import {
  createRequestContext,
  requireTenantScope,
  type RequestContextHeaders,
} from "../../../shared/dist/middleware/request-context";

import {
  type ComplianceMutationType,
  ComplianceRepository,
  type ScreeningRecord,
} from "../store/compliance-repository";

interface ScreeningRequest {
  headers: RequestContextHeaders;
  body: {
    tenant_id: string;
    stablecoin_id: string;
    operation: ComplianceMutationType;
    subject: string;
    amount?: string;
    onchain_blacklisted: boolean;
    reason_details?: Record<string, unknown>;
  };
}

export interface ScreeningResponse {
  screening_id: string;
  decision: "allow" | "deny" | "review_required";
  reason_code: string;
  review_status: ScreeningRecord["review_status"];
}

export class ScreeningRouteHandlers {
  constructor(
    private readonly repository: ComplianceRepository,
    private readonly requireRole: "issuer" | "compliance" = "issuer"
  ) {}

  private withErrorEnvelope<T>(requestId: string, run: () => T): ApiEnvelope<T> {
    try {
      return createSuccessEnvelope(run(), "COMPLIANCE_SCREENING_OK", {
        requestId,
      });
    } catch (error) {
      const stableError = toStableError(error);
      return createErrorEnvelope(
        {
          message: stableError.message,
          details: {
            ...stableError.details,
            stable_code: stableError.code,
          },
        },
        stableError.code,
        { requestId }
      );
    }
  }

  evaluate(request: ScreeningRequest): ApiEnvelope<ScreeningResponse> {
    const context = createRequestContext(request.headers);

    return this.withErrorEnvelope<ScreeningResponse>(context.request_id, () => {
      requireTenantScope(context, request.body.tenant_id);

      const identity = parseServiceIdentity(request.headers);
      if (this.requireRole === "issuer") {
        requireIssuerAuthorization(identity, request.body.tenant_id);
      }

      const screening = this.repository.evaluateAndStoreScreening({
        tenant_id: request.body.tenant_id,
        request_id: context.request_id,
        stablecoin_id: request.body.stablecoin_id,
        operation: request.body.operation,
        subject: request.body.subject,
        amount: request.body.amount,
        onchain_blacklisted: request.body.onchain_blacklisted,
        reason_details: request.body.reason_details,
      });

      return {
        screening_id: screening.id,
        decision: screening.decision,
        reason_code: screening.reason_code,
        review_status: screening.review_status,
      };
    });
  }
}
