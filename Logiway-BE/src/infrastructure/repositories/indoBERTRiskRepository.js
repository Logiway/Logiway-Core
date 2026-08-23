import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import { fileURLToPath } from "url";
import { readFileSync, existsSync } from "fs";
import { RiskRepository } from "../../repositories/RiskRepository.js";
import { normalizeRiskPoints } from "../../domain/services/routingRisk.js";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPORTS_JSON_PATH = path.join(__dirname, "../../data/logisticsRiskReports.json");

export class IndoBertRiskRepository extends RiskRepository {
  constructor({
    pythonExec = process.env.PYTHON_EXEC || (process.platform === "win32" ? "py" : "python3"),
    scriptPath = path.join(__dirname, "../ml/classifier.py"),
    modelPath = process.env.MODEL_PATH,
    reportsJsonPath = process.env.RISK_REPORTS_JSON_PATH || DEFAULT_REPORTS_JSON_PATH,
    logger = console,
  } = {}) {
    super();
    this.pythonExec = pythonExec;
    this.classifierScript = path.resolve(scriptPath);
    this.modelPath = modelPath;
    this.reportsJsonPath = path.resolve(reportsJsonPath);
    this.logger = logger;
  }

  #loadRiskReports() {
    try {
      if (existsSync(this.reportsJsonPath)) {
        const rawData = readFileSync(this.reportsJsonPath, "utf-8");
        return JSON.parse(rawData);
      }
      this.logger.warn(`[IndoBERT] Risk reports JSON file not found at ${this.reportsJsonPath}`);
    } catch (err) {
      this.logger.error(`[IndoBERT] Failed to read risk reports JSON file: ${err.message}`);
    }
    return [];
  }

  async findRouteRisks({ origin, dest }) {
    if (typeof origin !== "string" || typeof dest !== "string") {
      return [];
    }

    const normOrigin = origin.toLowerCase().trim();
    const normDest = dest.toLowerCase().trim();

    const reportsDatabase = this.#loadRiskReports();

    const candidateReports = reportsDatabase.filter((report) => {
      return Array.isArray(report.regions) && report.regions.some(
        (region) => normOrigin.includes(region) || normDest.includes(region)
      );
    });

    const selectedReports = candidateReports.length > 0
      ? candidateReports.slice(0, 5)
      : reportsDatabase.slice(0, 2);

    if (selectedReports.length === 0) {
      return [];
    }

    const classified = await this.classifyRiskReports(selectedReports);

    const riskPoints = classified
      .filter((item) => item.severity > 0 && item.label !== "AMAN_INFORMASI")
      .map((item) => ({
        location_name: item.location_name,
        severity: item.severity,
        note: `[IndoBERT: ${item.label} (${Math.round((item.confidence || 0) * 100)}%)] ${item.text}`,
      }));

    return normalizeRiskPoints(riskPoints);
  }

  async #execPythonCommand(executable, jsonInput) {
    return await execFileAsync(
      executable,
      [this.classifierScript, jsonInput],
      {
        env: {
          ...process.env,
          ...(this.modelPath && { MODEL_PATH: this.modelPath }),
        },
        maxBuffer: 10 * 1024 * 1024,
      }
    );
  }

  async classifyRiskReports(reports) {
    if (!reports || reports.length === 0) return [];

    const jsonInput = JSON.stringify(reports);
    const candidateExecs = [
      this.pythonExec,
      process.platform === "win32" ? "py" : "python3",
      "python",
      "python3",
    ].filter((exec, idx, self) => exec && self.indexOf(exec) === idx);

    let lastError = null;
    let stdout = null;
    let stderr = null;

    for (const exec of candidateExecs) {
      try {
        const result = await this.#execPythonCommand(exec, jsonInput);
        stdout = result.stdout;
        stderr = result.stderr;
        break;
      } catch (err) {
        lastError = err;
        if (err.code === "ENOENT") {
          continue;
        }
        break;
      }
    }

    if (!stdout) {
      this.logger.error(`[IndoBERT] Classification process error: ${lastError?.message}`);
      return reports.map((r) => ({
        ...r,
        label: "AMAN_INFORMASI",
        label_id: 0,
        confidence: 1.0,
        severity: 0,
        error: lastError?.message,
      }));
    }

    if (stderr && stderr.trim()) {
      const cleanStderr = stderr
        .split("\n")
        .filter(
          (line) =>
            !line.includes("Loading weights") &&
            !line.includes("it/s") &&
            !line.includes("tqdm")
        )
        .join("\n")
        .trim();

      if (cleanStderr) {
        this.logger.warn(`[IndoBERT] Python stderr warning: ${cleanStderr}`);
      }
    }

    try {
      const classified = JSON.parse(stdout);
      return Array.isArray(classified) ? classified : [classified];
    } catch (parseErr) {
      this.logger.error(`[IndoBERT] Failed to parse stdout JSON: ${parseErr.message}`);
      return reports.map((r) => ({
        ...r,
        label: "AMAN_INFORMASI",
        label_id: 0,
        confidence: 1.0,
        severity: 0,
      }));
    }
  }
}