import nodemailer from "nodemailer";

export default async function handler(req, res) {

  // ✅ CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { userEmail, userName, orderId, status, orderItems } = req.body;

    if (!userEmail || !orderId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // ✅ MAIL CONFIG (Zoho / Gmail both supported)
    const transporter = nodemailer.createTransport({
      service: "gmail",

      host: "smtp.gmail.com", // or smtp.gmail.com
      port: 465,
      secure: true,

      auth: {
        user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
      },
    });

    // ✅ STATUS SUBJECT
    const subjectMap = {
      pending : "⏳ Order Confirmed",
      processing: "🛠️ Order Processing",
      "ready to ship": "📦 Order Ready to Ship",
      shipped: "🚚 Order Shipped",
      delivered: "✅ Order Delivered",
      returned: "↩️ Order Returned",
      cancelled: "❌ Order Cancelled",
    };

    const subject = subjectMap[status] || "📦 Order Update";

    // ✅ STATUS COLOR
    const statusColor = {
      pending : "#fbbf24",
      processing: "#f59e0b",
      "ready to ship": "#6366f1",
      shipped: "#3b82f6",
      delivered: "#10b981",
      cancelled: "#ef4444",
      returned: "#6b7280",
    }[status] || "#10b981";

    // ✅ PRODUCTS HTML
    const items = Array.isArray(orderItems) ? orderItems : [];

   const total = items.reduce((sum, item) => {
  return sum + (item.price || 0) * (item.quantity || 1);
}, 0);

const productHTML = items.map((item, index) => `
  <tr>
    <td style="padding:10px;border:1px solid #ddd;text-align:center;">
      ${index + 1}
    </td>
    <td style="padding:10px;border:1px solid #ddd;">
      ${item.name}
    </td>
    <td style="padding:10px;border:1px solid #ddd;text-align:center;">
      ${item.quantity || 1}
    </td>
    <td style="padding:10px;border:1px solid #ddd;text-align:right;">
      ₹${Number(item.price || 0).toLocaleString("en-IN")}
    </td>
    <td style="padding:10px;border:1px solid #ddd;text-align:right;">
      ₹${Number((item.price || 0) * (item.quantity || 1)).toLocaleString("en-IN")}
    </td>
  </tr>
`).join("");

const html = `
<div style="font-family:Arial;background:#f4f6f8;padding:20px;">
  <div style="max-width:700px;margin:auto;background:#fff;border-radius:10px;overflow:hidden;">

    <!-- HEADER -->
    <div style="background:#111827;color:white;padding:20px;text-align:center;">
      <h2 style="margin:0;">🛍️ Order Update</h2>
    </div>

    <!-- BODY -->
    <div style="padding:25px;">
      <p>Hi <b>${userName || "Customer"}</b>,</p>

      <p>
        Your order <b>#${orderId}</b> is now 
        <span style="color:${statusColor};font-weight:bold;">
          ${status}
        </span>
      </p>

      <h3 style="margin-top:20px;">🧾 Order Summary</h3>

      <!-- TABLE -->
      <table width="100%" style="border-collapse:collapse;margin-top:10px;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th style="padding:10px;border:1px solid #ddd;">#</th>
            <th style="padding:10px;border:1px solid #ddd;">Item</th>
            <th style="padding:10px;border:1px solid #ddd;">Qty</th>
            <th style="padding:10px;border:1px solid #ddd;">Price</th>
            <th style="padding:10px;border:1px solid #ddd;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${productHTML}
        </tbody>
      </table>

      <!-- GRAND TOTAL -->
      <div style="margin-top:15px;text-align:right;">
        <h3 style="margin:0;">
          Grand Total: ₹${total.toLocaleString("en-IN")}
        </h3>
      </div>

      <!-- BUTTON -->

      <p>Thank you for shopping with us ❤️</p>
    </div>

    <!-- FOOTER -->
    <div style="background:#f3f4f6;padding:12px;text-align:center;font-size:12px;color:#555;">
      © ${new Date().getFullYear()} Vistaraa | All Rights Reserved
    </div>

  </div>
</div>
`;

    // ✅ SEND EMAIL
    await transporter.sendMail({
      from: `"Vistaraa" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject,
      html,
    });

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error("Email Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
