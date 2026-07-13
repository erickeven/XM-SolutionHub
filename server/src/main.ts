import "dotenv/config";
import { createApp } from "./app.js";
import { createProductionDependencies } from "./composition-root.js";
import { parseEnvironment } from "./shared/config/env.js";

const environment = parseEnvironment(process.env);
const { prisma, appDependencies } = createProductionDependencies(environment);
const app = createApp(appDependencies);
const server = app.listen(environment.PORT, "0.0.0.0", () => {
  process.stdout.write(
    `${JSON.stringify({ level: "info", message: "API_STARTED", port: environment.PORT, service: "api" })}\n`
  );
});

async function shutdown(signal: string): Promise<void> {
  process.stdout.write(`${JSON.stringify({ level: "info", message: "API_STOPPING", signal, service: "api" })}\n`);
  server.close();
  await prisma.$disconnect();
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));
