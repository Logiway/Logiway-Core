import "dotenv/config";
import { createApp } from "./app.js";
import { createContainer } from "./container.js";

const container = createContainer();
const app = createApp(container);
const server = app.listen(container.config.port, () => {
  container.logger.info("Logiway backend listening", {
    port: container.config.port,
  });
});

function shutdown(signal) {
  container.logger.info("Shutdown requested", { signal });
  server.close((error) => {
    if (error) {
      container.logger.error("Shutdown failed", { error: error.message });
      process.exitCode = 1;
    }
  });
}

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));
