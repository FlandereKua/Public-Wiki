const fs = require("fs");
const path = require("path");

const CORE_ATTRIBUTES = [
  { label: "Strength (STR)", key: "STR" },
  { label: "Dexterity (DEX)", key: "DEX" },
  { label: "Intelligence (INT)", key: "INT" },
  { label: "Wisdom (WIS)", key: "WIS" },
  { label: "Charisma (CHA)", key: "CHA" },
  { label: "Luck (LCK)", key: "LCK" },
  { label: "Faith (FTH)", key: "FTH" }
];

const COMBAT_STATS = [
  { label: "Health Points (HP)", key: "hp" },
  { label: "Resource (Mana/Stamina)", key: "resource" },
  { label: "Armor Class (AC)", key: "ac" },
  { label: "Movement (MV)", key: "mv" },
  { label: "Speed (SPD)", key: "spd" }
];

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findBacktickValue(content, label) {
  const pattern = new RegExp("\\*\\*" + escapeRegExp(label) + "\\*\\*:\\s*`([^`]*)`", "i");
  const match = content.match(pattern);
  return match ? match[1].trim() : null;
}

function parseNumericToken(raw) {
  if (!raw) return null;
  const sanitized = raw.replace(/[^0-9+\-.\/]/g, "").replace(/\+/g, "");
  if (sanitized === "" || sanitized === "." || sanitized === "-" || sanitized === "+") {
    return null;
  }
  const value = Number(sanitized);
  return Number.isFinite(value) ? value : null;
}

function parseResourceStat(raw) {
  if (!raw) return { current: null, max: null };
  const parts = raw.split("/").map(part => part.trim());
  if (parts.length === 1) {
    const value = parseNumericToken(parts[0]);
    return { current: value, max: value };
  }
  const current = parseNumericToken(parts[0]);
  const max = parseNumericToken(parts[1]);
  return { current, max };
}

function getFileId(filePath) {
  const base = path.basename(filePath, path.extname(filePath));
  return base.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function parseCharacterMarkdown(content, filePath) {
  const character = {
    id: getFileId(filePath),
    name: null,
    displayName: path.basename(filePath, path.extname(filePath)),
    tier: null,
    race: null,
    core: {},
    combat: {
      hp: { current: null, max: null },
      resource: { current: null, max: null, label: "Resource" },
      ac: null,
      spd: null,
      mv: null
    },
    sourcePath: filePath,
    rawContent: content
  };

  const nameValue = findBacktickValue(content, "Name");
  if (nameValue) {
    character.name = nameValue;
  } else {
    // Fallback: keep original file casing instead of lower-cased id
    character.name = character.displayName;
  }

  const raceValue = findBacktickValue(content, "Race/Origin");
  if (raceValue) character.race = raceValue;

  const tierValue = findBacktickValue(content, "Tier");
  if (tierValue) {
    const tierNumber = parseNumericToken(tierValue);
    character.tier = tierNumber ?? tierValue;
  }

  CORE_ATTRIBUTES.forEach(({ label, key }) => {
    const raw = findBacktickValue(content, label);
    const value = parseNumericToken(raw);
    character.core[key] = value;
  });

  COMBAT_STATS.forEach(({ label, key }) => {
    const raw = findBacktickValue(content, label);
    if (key === "hp") {
      character.combat.hp = parseResourceStat(raw);
    } else if (key === "resource") {
      character.combat.resource = {
        ...parseResourceStat(raw),
        label: label.replace(" (Mana/Stamina)", "")
      };
    } else if (key === "mv") {
      character.combat.mv = parseNumericToken(raw);
    } else if (key === "spd") {
      character.combat.spd = parseNumericToken(raw);
    } else if (key === "ac") {
      character.combat.ac = parseNumericToken(raw);
    }
  });

  if (character.combat.spd != null && Number.isFinite(character.combat.spd)) {
    const calculated = character.combat.spd / 3;
    if (!Number.isFinite(character.combat.mv)) {
      character.combat.mv = Number.isFinite(calculated) ? Number(calculated.toFixed(2)) : null;
    }
  }

  return character;
}

function loadSheets(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  return entries
    .filter(entry => entry.isFile() && entry.name.toLowerCase().endsWith(".md"))
    .map(entry => {
      const filePath = path.join(directory, entry.name);
      const content = fs.readFileSync(filePath, "utf8");
      return parseCharacterMarkdown(content, filePath);
    });
}

function loadCharacters(directory) {
  return loadSheets(directory);
}

module.exports = {
  loadCharacters,
  parseCharacterMarkdown,
  loadSheets
};