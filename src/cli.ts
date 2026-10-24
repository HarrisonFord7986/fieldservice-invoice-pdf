import { generateAndEmailInvoice } from "./invoice_service.js";

const input = process.argv[2];
if (!input) {
  console.error("Usage: npm start -- order.json");
  process.exit(1);
}

const order = JSON.parse(await (await import("node:fs/promises")).readFile(input, "utf8"));
const result = await generateAndEmailInvoice(order);
console.log(JSON.stringify({ sent: true, ...result }));
