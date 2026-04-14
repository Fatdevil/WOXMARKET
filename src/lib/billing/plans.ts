export interface PlanBillingConfig {
  includedLimit: number;
  overageRatePer1kCents: number; // For Stripe billing, represent in cents or standard units 
  absoluteCeiling: number;
}

/**
 * Central Source of Truth for Plan Billing Rules
 * @param subscriptionPrice - The monthly recurring price of the subscribed voice
 * @returns PlanBillingConfig - includes quota limit, overage rate, and safety guards
 */
export function getPlanBillingConfig(subscriptionPrice: number | null): PlanBillingConfig {
  if (subscriptionPrice === null) {
    return { includedLimit: 0, overageRatePer1kCents: 0, absoluteCeiling: 0 };
  }

  // Tier 1
  if (subscriptionPrice <= 9) {
    // e.g. 10k included, 100k absolute max. Overage cost: $5.00 per 10k => $0.50 per 1k = 50 cents
    return { includedLimit: 10000, overageRatePer1kCents: 50, absoluteCeiling: 100000 };
  }
  
  // Tier 2
  if (subscriptionPrice <= 19) {
    // e.g. 30k included, 200k absolute max
    return { includedLimit: 30000, overageRatePer1kCents: 40, absoluteCeiling: 200000 };
  }
  
  // High-tier / Enterprise
  // e.g. 100k included, 500k absolute max
  return { includedLimit: 100000, overageRatePer1kCents: 30, absoluteCeiling: 500000 };
}

/**
 * Legacy Helper to map Prisma subscription prices to hard character limits per month.
 * Backwards compatible using the central config.
 */
export function getMonthlyCharacterLimit(subscriptionPrice: number | null): number {
  return getPlanBillingConfig(subscriptionPrice).includedLimit;
}
