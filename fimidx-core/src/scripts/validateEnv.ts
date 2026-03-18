import { ZodError } from "zod";
import { getCoreConfig } from "../common/getCoreConfig.js";
import { envVars } from "../definitions/coreConfig.js";

function printMissingEnvVars(): number {
  const missing: string[] = [];

  for (const envKey of Object.keys(envVars) as Array<keyof typeof envVars>) {
    const envName = envVars[envKey];
    const value = process.env[envName];
    if (value == null || value === "") missing.push(envName);
  }

  if (missing.length > 0) {
    console.log("Missing env vars:");
    for (const m of missing.sort()) {
      console.log(`- ${m}`);
    }
  } else {
    console.log("All expected env vars are present.");
  }

  return missing.length;
}

function formatZodError(error: unknown): string {
  if (!(error instanceof ZodError)) {
    return error instanceof Error ? error.message : String(error);
  }

  // Keep output stable and easy to grep in CI logs.
  const lines: string[] = [];
  lines.push(`Zod validation failed with ${error.issues.length} issue(s).`);
  for (const issue of error.issues) {
    const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
    lines.push(`- ${path}: ${issue.message}`);
  }
  return lines.join("\n");
}

async function main(): Promise<void> {
  const missingCount = printMissingEnvVars();

  try {
    console.log("");
    // Uses coreConfigSchema.parse under the hood.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const config = getCoreConfig();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    void config;
    console.log("Core config validation: OK");
  } catch (error: unknown) {
    console.error(formatZodError(error));
    if (missingCount > 0) {
      console.error(
        "\nTip: missing env vars almost certainly explain the validation errors above."
      );
    }
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
