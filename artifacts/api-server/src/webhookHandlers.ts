import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db, taxiUsers } from "@workspace/db";
import { getStripeSecretKey } from "./stripeClient.js";
import { logger } from "./lib/logger.js";

function planExpiryDate(plan: string): Date {
  const d = new Date();
  if (plan === "yearly") {
    d.setFullYear(d.getFullYear() + 1);
  } else {
    d.setMonth(d.getMonth() + 1);
  }
  return d;
}

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        "STRIPE WEBHOOK ERROR: Payload must be a Buffer. " +
          "Ensure the webhook route is registered BEFORE app.use(express.json()).",
      );
    }

    const secretKey = await getStripeSecretKey();
    const stripe = new Stripe(secretKey);

    // For webhook verification we need the endpoint's signing secret.
    // stripe-replit-sync handles this when a managed webhook is set up.
    // If STRIPE_WEBHOOK_SECRET env is set (from managed webhook setup), use it.
    // Otherwise construct without verification (dev/testing only).
    const webhookSecret = process.env["STRIPE_WEBHOOK_SECRET"] ?? "";

    let event: Stripe.Event;
    if (webhookSecret) {
      try {
        event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(`Webhook signature verification failed: ${msg}`);
      }
    } else {
      // No signing secret configured — parse payload but skip verification.
      // This happens before stripe-replit-sync has set up the managed webhook.
      logger.warn(
        "STRIPE_WEBHOOK_SECRET not set — skipping signature verification. " +
          "Set up the managed webhook via stripe-replit-sync.",
      );
      event = JSON.parse(payload.toString()) as Stripe.Event;
    }

    logger.info({ type: event.type }, "Stripe webhook received");

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.payment_status !== "paid") return;

      const phone = session.metadata?.["phone"];
      const plan = session.metadata?.["plan"] ?? "monthly";

      if (!phone) {
        logger.warn({ sessionId: session.id }, "Checkout session missing phone metadata");
        return;
      }

      const expiryDate = planExpiryDate(plan);

      try {
        const result = await db
          .update(taxiUsers)
          .set({ status: "active", expiryDate, updatedAt: new Date() })
          .where(eq(taxiUsers.phone, phone))
          .returning({ id: taxiUsers.id });

        if (result.length === 0) {
          logger.warn({ phone, sessionId: session.id }, "No user found for Stripe payment");
        } else {
          logger.info(
            { phone, plan, expiryDate: expiryDate.toISOString(), sessionId: session.id },
            "Subscription activated via Stripe",
          );
        }
      } catch (err) {
        logger.error({ err, phone, sessionId: session.id }, "Failed to activate subscription");
        throw err;
      }
    }
  }
}
