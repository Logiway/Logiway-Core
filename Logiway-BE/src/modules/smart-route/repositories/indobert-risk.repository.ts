import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";
import type { RouteGeocodingInput } from "../../../types/location.js";
import type { Logger } from "../../../types/logger.js";
import type { RiskPoint, RiskRepository } from "../../../types/routing.js";
import { normalizeRiskPoints } from "../smart-route-risk.js";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface IndoBertRiskRepositoryOptions {
  pythonExec?: string;
  scriptPath?: string;
  modelPath?: string;
  logger?: Logger;
}

export interface RawRiskReport {
  location_name?: string;
  text: string;
  [key: string]: unknown;
}

export interface ClassifiedReport extends RawRiskReport {
  label?: string;
  label_id?: number;
  confidence?: number;
  severity?: number;
  error?: string;
}

function resolveDefaultScriptPath(): string {
  const distPath = path.join(__dirname, "../ml/classifier.py");
  if (existsSync(distPath)) return distPath;
  const srcPath = path.join(__dirname, "../../../src/modules/smart-route/ml/classifier.py");
  if (existsSync(srcPath)) return srcPath;
  return distPath;
}

export class IndoBertRiskRepository implements RiskRepository {
  private readonly pythonExec: string;
  private readonly classifierScript: string;
  private readonly modelPath?: string;
  private readonly logger?: Logger;

  constructor({
    pythonExec = process.env.PYTHON_EXEC || (process.platform === "win32" ? "py" : "python3"),
    scriptPath = process.env.CLASSIFIER_SCRIPT_PATH || resolveDefaultScriptPath(),
    modelPath = process.env.MODEL_PATH,
    logger,
  }: IndoBertRiskRepositoryOptions = {}) {
    this.pythonExec = pythonExec;
    this.classifierScript = path.resolve(scriptPath);
    if (modelPath) this.modelPath = modelPath;
    if (logger) this.logger = logger;
  }

  async findRouteRisks({ origin, dest }: RouteGeocodingInput): Promise<RiskPoint[]> {
    const normOrigin = origin.trim();
    const normDest = dest.trim();

    const itemsToClassify: RawRiskReport[] = [
      {
        location_name: normOrigin,
        text: `Jalur pengiriman truk barang dan pos pemeriksaan di sekitar ${normOrigin}`,
      },
      {
        location_name: normDest,
        text: `Jalur rute truk dan titik pemeriksaan logistik di sekitar ${normDest}`,
      },
    ];

    const classified = await this.classifyRiskReports(itemsToClassify);

    const rawRiskPoints: RiskPoint[] = [];
    for (const item of classified) {
      if ((item.severity ?? 0) > 0 && item.label !== "AMAN_INFORMASI" && typeof item.location_name === "string") {
        const labelStr = item.label ?? "PUNGLI";
        const confidencePctStr = String(Math.round((item.confidence ?? 0) * 100));
        const textStr = item.text;
        rawRiskPoints.push({
          location_name: item.location_name,
          severity: item.severity ?? 1,
          note: `[IndoBERT: ${labelStr} (${confidencePctStr}%)] ${textStr}`,
        });
      }
    }

    return normalizeRiskPoints(rawRiskPoints);
  }

  async classifyText(text: string): Promise<ClassifiedReport> {
    const reports = await this.classifyRiskReports([{ text }]);
    return reports[0] ?? { text, label: "AMAN_INFORMASI", label_id: 0, confidence: 1.0, severity: 0 };
  }

  async #execPythonCommand(executable: string, jsonInput: string) {
    return await execFileAsync(executable, [this.classifierScript, jsonInput], {
      env: {
        ...process.env,
        ...(this.modelPath && { MODEL_PATH: this.modelPath }),
      },
      maxBuffer: 10 * 1024 * 1024,
    });
  }

  async classifyRiskReports(reports: RawRiskReport[]): Promise<ClassifiedReport[]> {
    if (reports.length === 0) return [];

    const jsonInput = JSON.stringify(reports);
    const candidateExecs = [
      this.pythonExec,
      process.platform === "win32" ? "py" : "python3",
      "python",
      "python3",
    ].filter((exec, idx, self) => exec && self.indexOf(exec) === idx);

    let lastError: Error | null = null;
    let stdout: string | null = null;
    let stderr: string | null = null;

    for (const exec of candidateExecs) {
      try {
        const result = await this.#execPythonCommand(exec, jsonInput);
        stdout = result.stdout;
        stderr = result.stderr;
        break;
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if ((err as { code?: string }).code === "ENOENT") {
          continue;
        }
        break;
      }
    }

    if (!stdout) {
      const errMessageStr = lastError?.message ?? "Unknown error";
      this.logger?.error(`[IndoBERT] Classification process error: ${errMessageStr}`);
      return reports.map((r) => {
        const report: ClassifiedReport = {
          ...r,
          label: "AMAN_INFORMASI",
          label_id: 0,
          confidence: 1.0,
          severity: 0,
        };
        if (lastError?.message) {
          report.error = lastError.message;
        }
        return report;
      });
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
        this.logger?.warn(`[IndoBERT] Python stderr warning: ${cleanStderr}`);
      }
    }

    try {
      const classified: unknown = JSON.parse(stdout);
      return Array.isArray(classified) ? (classified as ClassifiedReport[]) : [(classified as ClassifiedReport)];
    } catch (parseErr: unknown) {
      const messageStr = parseErr instanceof Error ? parseErr.message : String(parseErr);
      this.logger?.error(`[IndoBERT] Failed to parse stdout JSON: ${messageStr}`);
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
