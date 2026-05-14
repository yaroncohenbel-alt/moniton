/**
 * Stripe routes
 *
 * POST /stripe/checkout  — create a Stripe Checkout session (returns { url })
 *
 * NOTE: The webhook endpoint (POST /stripe/webhook) is registered in app.ts
 * BEFORE express.json() so it receives the raw Buffer required by Stripe.
 */
import { Router } from "express";
import { getUncachableStripeClient } from "../stripeClient.js";
import { logger } from "../lib/logger.js";

const router = Router();

const PLANS = {
  monthly: { amountAgorot: 2900, label: "מנוי חודשי - Taxi meter pro" },
  yearly: { amountAgorot: 24900, label: "מנוי שנתי - Taxi meter pro" },
} as const;
type PlanKey = keyof typeof PLANS;

router.post("/stripe/checkout", async (req, res) => {
  const { phone, plan } = req.body as { phone?: string; plan?: string };

  if (!phone || !phone.trim()) {
    res.status(400).json({ error: "phone is required" });
    return;
  }

  const planKey: PlanKey = plan === "yearly" ? "yearly" : "monthly";
  const planInfo = PLANS[planKey];

  const rawDomain = (process.env["REPLIT_DOMAINS"] ?? "").split(",")[0]?.trim() ?? "";
  const appUrl = rawDomain ? `https://${rawDomain}` : "http://localhost";

  try {
    const stripe = await getUncachableStripeClient();

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "ils",
            product_data: {
              name: planInfo.label,
              description:
                planKey === "yearly"
                  ? "גישה מלאה לכל התכונות למשך שנה"
                  : "גישה מלאה לכל התכונות למשך חודש",
            },
            unit_amount: planInfo.amountAgorot,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${appUrl}?stripe=success`,
      cancel_url: `${appUrl}?stripe=cancel`,
      metadata: {
        phone: phone.trim(),
        plan: planKey,
      },
    });

    logger.info(
      { phone: phone.trim(), plan: planKey, sessionId: session.id },
      "Stripe checkout session created",
    );

    res.json({ url: session.url });
  } catch (err) {
    logger.error({ err }, "Failed to create Stripe checkout session");
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

export default router;
