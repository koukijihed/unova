#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { parse } from "csv-parse/sync";
import {
  hashCin,
  isValidCin,
  normalizeCin,
  normalizeName,
} from "../src/lib/cin/shared.mjs";

const REQUIRED_COLUMNS = [
  "cin",
  "first_name",
  "last_name",
  "program_code",
  "class_name",
];
const EXISTING_LOOKUP_BATCH = 50;
const INSERT_BATCH = 200;

// Node.js 20 n'expose pas WebSocket nativement. Ce script n'utilise jamais
// Realtime : un transport désactivé évite l'erreur au démarrage.
class DisabledRealtimeTransport {}

const USAGE = `Usage :
  node --env-file=.env.local scripts/import-roster.mjs <fichier.csv> [--apply] [--skip-invalid]
  node --env-file=.env.local scripts/import-roster.mjs --self-test

Colonnes attendues : cin, first_name, last_name, program_code, class_name

Sans --apply, le script effectue une simulation et n'écrit rien.
Avec --apply, les lignes valides sont insérées par lots.
Sans --skip-invalid, aucune ligne n'est insérée si le fichier contient une ligne invalide.`;

function fail(message) {
  console.error(`Erreur : ${message}`);
  process.exitCode = 1;
}

function readCell(record, key) {
  const value = record[key];
  return typeof value === "string" ? value.trim() : "";
}

function classKey(programCode, className) {
  return `${programCode.trim().toLowerCase()}\u0000${className
    .trim()
    .toLowerCase()}`;
}

function parseArguments(argv) {
  const options = {
    file: null,
    apply: false,
    skipInvalid: false,
    selfTest: false,
  };

  for (const argument of argv) {
    if (argument === "--apply") {
      options.apply = true;
    } else if (argument === "--skip-invalid") {
      options.skipInvalid = true;
    } else if (argument === "--self-test") {
      options.selfTest = true;
    } else if (argument.startsWith("--")) {
      fail(`Option inconnue : ${argument}`);
      return null;
    } else if (options.file) {
      fail("Un seul fichier CSV est accepté.");
      return null;
    } else {
      options.file = argument;
    }
  }

  return options;
}

function runSelfTest() {
  const checks = [
    {
      label: 'normalizeCin("  12 345 678")',
      actual: normalizeCin("  12 345 678"),
      expected: "12345678",
    },
    {
      label: 'normalizeName("Hélène Ben Ali")',
      actual: normalizeName("Hélène Ben Ali"),
      expected: "helenebenali",
    },
    {
      label: 'isValidCin("1234567")',
      actual: isValidCin("1234567"),
      expected: false,
    },
  ];

  for (const check of checks) {
    if (check.actual !== check.expected) {
      throw new Error(
        `Auto-test échoué pour ${check.label} : résultat inattendu.`,
      );
    }
  }

  console.log("OK");
}

function loadEnvironment() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  const pepper = process.env.CIN_PEPPER;
  const missing = [
    !url ? "NEXT_PUBLIC_SUPABASE_URL" : null,
    !secretKey ? "SUPABASE_SECRET_KEY" : null,
    !pepper ? "CIN_PEPPER" : null,
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new Error(
      `Variables d'environnement manquantes : ${missing.join(", ")}.`,
    );
  }

  return { url, secretKey, pepper };
}

function readCsv(file) {
  let content;

  try {
    content = readFileSync(file, "utf8");
  } catch {
    throw new Error(`Impossible de lire le fichier « ${file} ».`);
  }

  if (!content.trim()) {
    throw new Error("Le fichier CSV est vide.");
  }

  let headerError = null;
  let records;

  try {
    records = parse(content, {
      bom: true,
      columns: (header) => {
        const names = header.map((name) => name.trim());
        const missing = REQUIRED_COLUMNS.filter(
          (column) => !names.includes(column),
        );
        const duplicates = names.filter(
          (name, index) => names.indexOf(name) !== index,
        );

        if (missing.length > 0) {
          headerError = `Colonnes manquantes : ${missing.join(", ")}.`;
        } else if (duplicates.length > 0) {
          headerError = `Colonnes en double : ${[...new Set(duplicates)].join(
            ", ",
          )}.`;
        }

        return names;
      },
      info: true,
      relax_column_count: true,
      skip_empty_lines: true,
      trim: true,
    });
  } catch {
    throw new Error(
      "Le fichier CSV n'a pas pu être lu. Vérifiez son format et ses séparateurs.",
    );
  }

  if (headerError) {
    throw new Error(headerError);
  }

  return records;
}

async function loadCurrentYearAndClasses(supabase) {
  const { data: year, error: yearError } = await supabase
    .from("academic_years")
    .select("id, label")
    .eq("is_current", true)
    .maybeSingle();

  if (yearError || !year) {
    throw new Error("Aucune année universitaire courante n'est configurée.");
  }

  const { data: classes, error: classesError } = await supabase
    .from("classes")
    .select("id, name, programs(code)")
    .eq("academic_year_id", year.id);

  if (classesError) {
    throw new Error("Impossible de charger les classes de l'année courante.");
  }

  const classesByKey = new Map();

  for (const row of classes ?? []) {
    const program = Array.isArray(row.programs)
      ? row.programs[0]
      : row.programs;
    const programCode =
      typeof program?.code === "string" ? program.code.trim() : "";
    const className = typeof row.name === "string" ? row.name.trim() : "";

    if (!programCode || !className || !row.id) {
      continue;
    }

    classesByKey.set(classKey(programCode, className), row.id);
  }

  return { yearLabel: year.label, classesByKey };
}

async function findExistingHashes(supabase, hashes) {
  const existing = new Set();

  for (let index = 0; index < hashes.length; index += EXISTING_LOOKUP_BATCH) {
    const batch = hashes.slice(index, index + EXISTING_LOOKUP_BATCH);
    const { data, error } = await supabase
      .from("student_roster")
      .select("cin_hash")
      .in("cin_hash", batch);

    if (error) {
      throw new Error(
        "Impossible de vérifier les lignes déjà présentes dans la base.",
      );
    }

    for (const row of data ?? []) {
      if (typeof row.cin_hash === "string") {
        existing.add(row.cin_hash);
      }
    }
  }

  return existing;
}

async function insertCandidates(supabase, candidates) {
  for (let index = 0; index < candidates.length; index += INSERT_BATCH) {
    const batch = candidates
      .slice(index, index + INSERT_BATCH)
      .map((candidate) => ({
        cin_hash: candidate.cinHash,
        last_name_norm: candidate.lastNameNorm,
        first_name: candidate.firstName,
        last_name: candidate.lastName,
        class_id: candidate.classId,
      }));

    const { error } = await supabase.from("student_roster").upsert(batch, {
      onConflict: "cin_hash",
      ignoreDuplicates: true,
    });

    if (error) {
      throw new Error(
        "L'insertion a échoué. Aucune donnée supplémentaire n'a été écrite.",
      );
    }
  }
}

function analyzeRecords(records, classesByKey, pepper) {
  const invalidRows = [];
  const unknownClassRows = [];
  const duplicateRows = [];
  const candidates = [];
  const seenHashes = new Map();

  for (const entry of records) {
    const record = entry.record;
    const line = entry.info.lines;

    if (entry.info.error) {
      invalidRows.push({
        line,
        reason: "nombre de colonnes incorrect",
      });
      continue;
    }

    const cin = normalizeCin(readCell(record, "cin"));
    const firstName = readCell(record, "first_name");
    const lastName = readCell(record, "last_name");
    const programCode = readCell(record, "program_code");
    const className = readCell(record, "class_name");

    if (!isValidCin(cin)) {
      invalidRows.push({
        line,
        reason: "CIN invalide (8 chiffres attendus)",
      });
      continue;
    }

    if (!firstName) {
      invalidRows.push({ line, reason: "prénom manquant" });
      continue;
    }

    const lastNameNorm = normalizeName(lastName);

    if (!lastNameNorm) {
      invalidRows.push({ line, reason: "nom de famille manquant" });
      continue;
    }

    if (!programCode) {
      invalidRows.push({ line, reason: "code programme manquant" });
      continue;
    }

    if (!className) {
      invalidRows.push({ line, reason: "nom de classe manquant" });
      continue;
    }

    const classId = classesByKey.get(classKey(programCode, className));

    if (!classId) {
      invalidRows.push({
        line,
        reason: `classe inconnue (${programCode} / ${className})`,
      });
      unknownClassRows.push({ line, programCode, className });
      continue;
    }

    const cinHash = hashCin(cin, pepper);
    const firstLine = seenHashes.get(cinHash);

    if (firstLine !== undefined) {
      duplicateRows.push({ line, firstLine });
      continue;
    }

    seenHashes.set(cinHash, line);
    candidates.push({
      line,
      cinHash,
      firstName,
      lastName,
      lastNameNorm,
      classId,
    });
  }

  return { invalidRows, unknownClassRows, duplicateRows, candidates };
}

function printLineList(title, rows, format) {
  if (rows.length === 0) {
    return;
  }

  console.log(`${title} : ${rows.length}`);
  for (const row of rows) {
    console.log(`  - ${format(row)}`);
  }
  console.log("");
}

async function main() {
  const options = parseArguments(process.argv.slice(2));

  if (!options) {
    return;
  }

  if (options.selfTest) {
    runSelfTest();
    return;
  }

  if (!options.file) {
    console.log(USAGE);
    process.exitCode = 1;
    return;
  }

  const { url, secretKey, pepper } = loadEnvironment();
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(url, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    realtime: {
      transport: DisabledRealtimeTransport,
    },
  });

  const records = readCsv(options.file);
  const { yearLabel, classesByKey } =
    await loadCurrentYearAndClasses(supabase);
  const { invalidRows, unknownClassRows, duplicateRows, candidates } =
    analyzeRecords(records, classesByKey, pepper);

  const existingHashes = await findExistingHashes(
    supabase,
    candidates.map((candidate) => candidate.cinHash),
  );
  const existingRows = [];
  const newCandidates = [];

  for (const candidate of candidates) {
    if (existingHashes.has(candidate.cinHash)) {
      existingRows.push({ line: candidate.line });
    } else {
      newCandidates.push(candidate);
    }
  }

  const validRows =
    newCandidates.length + existingRows.length + duplicateRows.length;
  const blockingInvalidRows = invalidRows.length > 0 && !options.skipInvalid;

  console.log("UNOVA — Import de la liste officielle");
  console.log(`Fichier : ${options.file}`);
  console.log(`Année universitaire : ${yearLabel}`);
  console.log(
    `Mode : ${options.apply ? "application" : "simulation (aucune écriture)"}`,
  );
  console.log("");

  console.log(`Lignes lues : ${records.length}`);
  console.log(`Lignes valides : ${validRows}`);
  console.log(`Lignes invalides : ${invalidRows.length}`);

  if (invalidRows.length > 0) {
    for (const row of invalidRows) {
      console.log(`  - ligne ${row.line} : ${row.reason}`);
    }
    console.log("");
  }

  printLineList("Doublons dans le fichier", duplicateRows, (row) => {
    return `ligne ${row.line} : doublon du CIN de la ligne ${row.firstLine}`;
  });

  printLineList("Déjà présentes en base", existingRows, (row) => {
    return `ligne ${row.line} : déjà présente`;
  });

  printLineList("Classes inconnues", unknownClassRows, (row) => {
    return `ligne ${row.line} : ${row.programCode} / ${row.className}`;
  });

  console.log(`Lignes à insérer : ${newCandidates.length}`);
  console.log("");

  if (blockingInvalidRows) {
    console.error(
      "Import bloqué : corrigez les lignes invalides ou relancez avec --skip-invalid.",
    );
    process.exitCode = 1;
    return;
  }

  if (!options.apply) {
    console.log(
      "Simulation terminée. Aucune donnée n'a été écrite. Relancez avec --apply pour importer.",
    );
    return;
  }

  if (newCandidates.length === 0) {
    console.log("Aucune nouvelle ligne à insérer.");
    return;
  }

  await insertCandidates(supabase, newCandidates);
  console.log(`Import terminé. ${newCandidates.length} ligne(s) insérée(s).`);
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : "L'import a échoué.");
});
