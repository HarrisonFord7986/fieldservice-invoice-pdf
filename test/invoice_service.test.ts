import assert from "node:assert/strict";
import test from "node:test";
import { canInvoice, validateWorkOrder } from "../src/invoice_service.js";

const order = {
  orderId: "WO-1042",
  customerName: "Northwind Service",
  customerEmail: "billing@example.com",
  status: "completed",
  technicianFollowUp: "Replace filter at next visit",
  photos: [{ url: "https://example.com/panel.jpg", caption: "Panel after repair" }]
};

test("completed work with follow-up is invoiceable; dispatched work is not", () => {
  const parsed = validateWorkOrder(order);
  assert.equal(canInvoice(parsed), true);
  assert.equal(canInvoice({ ...parsed, status: "dispatched" }), false);
});
