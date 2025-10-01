const fs = require("fs");
const path = require("path");
const { loadSheets } = require("../lib/characterParser");

const TRACKER_ROOT = path.resolve(__dirname, "..");
const PROJECT_ROOT = path.resolve(TRACKER_ROOT, "..");
const CHARACTERS_DIR = path.join(PROJECT_ROOT, "Characters");
const MONSTERS_DIR = path.join(PROJECT_ROOT, "Monsters");
const OUTPUT_DIR = path.join(TRACKER_ROOT, "output");

function ensureDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

function escapeCsvValue(value) {
  if (value === null || value === undefined) return "";
  const stringValue = String(value);
  return /[",\n]/.test(stringValue)
    ? '"' + stringValue.replace(/"/g, '""') + '"'
    : stringValue;
}

function buildCsvRow(record) {
  const hp = record.combat?.hp?.max ?? record.combat?.hp?.current ?? "";
  const mp = record.combat?.resource?.max ?? record.combat?.resource?.current ?? "";
  const values = [
    record.name || record.id,
    record.category,
    record.tier ?? "",
    record.race ?? "",
    record.combat?.spd ?? "",
    record.combat?.mv ?? "",
    hp,
    mp,
    record.combat?.ac ?? ""
  ];
  return values.map(escapeCsvValue).join(",");
}

function convertCharacters() {
  ensureDirectory(OUTPUT_DIR);

  const characters = loadSheets(CHARACTERS_DIR).map(sheet => ({
    ...sheet,
    category: "character"
  }));
  const monsters = loadSheets(MONSTERS_DIR).map(sheet => ({
    ...sheet,
    category: "monster"
  }));

  if (!characters.length && !monsters.length) {
    console.warn("No character or monster sheets found to convert.");
    return;
  }

  const allSheets = { characters, monsters };
  writeJson(path.join(OUTPUT_DIR, "all-sheets.json"), allSheets);
  writeJson(path.join(OUTPUT_DIR, "characters.json"), characters);
  writeJson(path.join(OUTPUT_DIR, "monsters.json"), monsters);

  const rows = [
    [
      "Name",
      "Category",
      "Tier",
      "Race",
      "SPD",
      "MV",
      "HP",
      "MP",
      "AC"
    ].join(","),
    ...characters.map(buildCsvRow),
    ...monsters.map(buildCsvRow)
  ];
  fs.writeFileSync(
    path.join(OUTPUT_DIR, "sheets-summary.csv"),
    rows.join("\n"),
    "utf8"
  );

  console.log(
    `Converted ${characters.length} character sheet(s) and ${monsters.length} monster sheet(s) to JSON/CSV in ${OUTPUT_DIR}`
  );
}

convertCharacters();