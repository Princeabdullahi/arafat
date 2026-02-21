import { whatsappMessageService } from "./whatsappMessageService";
import { sessionService } from "./sessionService";
import { flowRouterService } from "./flowRouterService";

type WhatsAppWebhookBody = any;

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

export const whatsappWebhookService = {
  handleIncoming: async (body: WhatsAppWebhookBody) => {
    const entry = body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messages = value?.messages;

    if (!Array.isArray(messages) || messages.length === 0) {
      return;
    }

    const message = messages[0];
    const from = normalizePhone(String(message?.from ?? ""));
    const text = String(message?.text?.body ?? "").trim();

    if (!from) return;

    const session = await sessionService.getOrCreate(from);
    const reply = await flowRouterService.handleUserMessage({
      phoneNumber: from,
      text,
      session,
    });

    if (reply) {
      await whatsappMessageService.sendText(from, reply);
    }
  },
};
