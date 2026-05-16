import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parseReportJsonV1 } from "../src/services/taras/schema.js";
import { renderDocx } from "../src/services/taras/renderDocx.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, "../src/services/taras/__fixtures__");

async function run() {
  const names = ["report-uk-sample.json", "report-en-sample.json"];
  for (const name of names) {
    const raw = JSON.parse(await readFile(join(fixturesDir, name), "utf8"));
    const report = parseReportJsonV1(raw);
    const buf = await renderDocx(report);
    if (buf.length < 2000 || buf.length > 500_000) {
      throw new Error(`${name}: unexpected docx size ${buf.length}`);
    }
    // eslint-disable-next-line no-console
    console.log(`OK ${name} -> ${buf.length} bytes`);
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
