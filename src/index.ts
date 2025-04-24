import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { ensureDirectories } from "./utils/ensureDirectories.js";
import { auth } from "./lib/auth.js";
import { config } from "./config/index.js";
import kycRouter from "./routes/kyc.routes.js";
import walletRouter from "./routes/wallet.routes.js";
import userRouter from "./routes/user.routes.js";
import balanceRouter from "./routes/balance.routes.js";
import depositRouter from "./routes/deposit.routes.js";
import withdrawalRouter from "./routes/withdrawal.routes.js";
import productRouter from "./routes/product.routes.js";
import statsRouter from "./routes/stats.routes.js";
import referralRouter from "./routes/referral.routes.js";
import plansRouter from "./routes/plans.routes.js";
import investmentRouter from "./routes/investment.routes.js";
import transferRouter from "./routes/transfer.routes.js";
import { mailService } from "./services/mail.service.js";
export const app = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
}>();

// Global middleware
app.use("*", logger());
app.use("/api/*", cors(config.cors));

// Routes
app.route("/api/kyc", kycRouter);
app.route("/api/wallet", walletRouter);
app.route("/api/users", userRouter);
app.route("/api/balance", balanceRouter);
app.route("/api/deposit", depositRouter);
app.route("/api/withdrawal", withdrawalRouter);
app.route("/api/products", productRouter);
app.route("/api/stats", statsRouter);
app.route("/api/referrals", referralRouter);
app.route("/api/plans", plansRouter);
app.route("/api/investments", investmentRouter);
app.route("/api/transfers", transferRouter);

// Auth routes
app.on(["POST", "GET"], "/api/auth/*", (c) => {
  return auth.handler(c.req.raw);
});

// Health check
app.get("/", (c) => {
  return c.text("Hello Hono!");
});

app.get("/test", (c)=> {
  let todos
  await fetch('https://jsonplaceholder.typicode.com/todos/1')
  .then(response => response.json())
  .then(json => todos = json)

  return c.json(todos)
})

app.get("/update-email", async (c) => {
  // Define your list of emails here
  const emails: string[] = [
    "gelar231@gmail.com",
    "jenniferlawrence89@yahoo.co.uk",
    "infoalticeusa@gmail.com",
    "tiviqbpcuyrsfty@hldrive.com",
    "pkenatu69@gmail.com",
    "infolaurastewart@gmail.com",
    "infoashleytaylor1@gmail.com",
    "raul@us-ic.com",
    "rob07nell30@hotmail.com",
    "inforaphaelcruzconsult@gmail.com",
    "infoblancaestrada@gmail.com",
    "muggybuddy1@gmail.com",
    "cotyvidi@polkaroad.net",
    "pahala.ar.le@gmail.com",
    "contactesinofinance@gmail.com",
    "infodevinbeck@gmail.com",
    "admin@resonantfinance.org",
    "0v7m0275wq@zudpck.com",
  ];

  // Log the beginning of the process
  console.log(
    "Starting system update email process for",
    emails.length,
    "emails."
  );

  for (const email of emails) {
    try {
      // Send the email using your mailService method
      await mailService.sendSystemUpdateEmail(email);
      console.log(`Email successfully sent to ${email}`);
    } catch (error) {
      console.error(`Error sending email to ${email}:`, error);
    }
  }

  console.log("Completed sending system update emails.");

  // Return a response to indicate processing is complete
  return c.text("System update emails have been processed.");
});

// Start server
const startServer = async () => {
  try {
    // Ensure all required storage directories exist
    await ensureDirectories(Object.values(config.storage));

    serve(
      {
        fetch: app.fetch,
        port: Number(config.port),
      },
      (info) => {
        console.log(`Server is running on http://localhost:${info.port}`);
      }
    );
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
