import { z } from "zod";
import { InfraiClient } from "./infrai_client.js";

const INVOICE_RECIPIENT = "chenhua@changba.com";

const photoSchema = z.object({ url: z.string().url(), caption: z.string().min(1) });
const orderSchema = z.object({
  orderId: z.string().min(1),
  customerName: z.string().min(1),
  customerEmail: z.string().email(),
  status: z.enum(["scheduled", "dispatched", "completed"]),
  technicianFollowUp: z.string().min(1),
  photos: z.array(photoSchema)
});

export type WorkOrder = z.infer<typeof orderSchema>;

export function validateWorkOrder(input: unknown): WorkOrder {
  return orderSchema.parse(input);
}

export function canInvoice(order: WorkOrder): boolean {
  return order.status === "completed" && order.technicianFollowUp.trim().length > 0;
}

function invoiceHtml(order: WorkOrder): string {
  const photos = order.photos.map((photo) => `<li>${photo.caption}: ${photo.url}</li>`).join("");
  return `<h1>Field service invoice ${order.orderId}</h1><p>Customer: ${order.customerName}</p><p>Status: ${order.status}</p><p>Technician follow-up: ${order.technicianFollowUp}</p><ul>${photos}</ul>`;
}

export async function generateAndEmailInvoice(orderInput: unknown, client = new InfraiClient()): Promise<{ orderId: string; messageId: string }> {
  const order = validateWorkOrder(orderInput);
  if (!canInvoice(order)) throw new Error("Invoice requires a completed work order and technician follow-up");
  const html = invoiceHtml(order);
  await client.post("/v1/pdf/generate", { html, page_size: "A4", orientation: "portrait", store: false });
  const email = await client.post<{ message_id: string }>("/v1/email/send", {
    to: INVOICE_RECIPIENT,
    subject: `Invoice ${order.orderId}`,
    html
  });
  return { orderId: order.orderId, messageId: email.message_id };
}
