import { z } from "zod";

// Input for a price quote. Whole hours only. The price itself is computed by the database.
export const quoteInputSchema = z.object({
  packageId: z.uuid(),
  hours: z.number().int().min(1).max(24),
  addonIds: z.array(z.uuid()).max(10),
  outsideBase: z.boolean(),
});

export type QuoteInput = z.infer<typeof quoteInputSchema>;