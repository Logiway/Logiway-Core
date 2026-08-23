// src/infrastructure/repositories/IndoBertRiskRepository.js
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import { fileURLToPath } from "url";
import { RiskRepository } from "../../repositories/RiskRepository.js";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class IndoBertRiskRepository extends RiskRepository {
  constructor(
    pythonExec = process.env.PYTHON_EXEC || "python",
    scriptPath = path.join(__dirname, "../ml/classifier.py")
  ) {
    super();
    this.pythonExec = pythonExec;
    this.classifierScript = path.resolve(scriptPath);
  }

  /**
   * Classifies array of reports or news items using local IndoBERT model
   * @param {Array<{id?: string, location_name: string, text: string}>} reports
   * @returns {Promise<Array>}
   */
  async classifyRiskReports(reports) {
    if (!reports || reports.length === 0) return [];

    try {
      const jsonInput = JSON.stringify(reports);

      const { stdout, stderr } = await execFileAsync(
        this.pythonExec,
        [this.classifierScript, jsonInput],
        {
          env: { ...process.env },
          maxBuffer: 10 * 1024 * 1024, 
        }
      );

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
          console.warn(`[IndoBERT] Python stderr warning: ${cleanStderr}`);
        }
      }

      const classified = JSON.parse(stdout);
      return Array.isArray(classified) ? classified : [classified];
    } catch (err) {
      console.error(`[IndoBERT] Classification process error: ${err.message}`);

      return reports.map((r) => ({
        ...r,
        label: "AMAN_INFORMASI",
        label_id: 0,
        confidence: 1.0,
        severity: 0,
        error: err.message,
      }));
    }
  }
}