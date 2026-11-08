import assert from "node:assert/strict";
import {
  DRIVE_KIND_LABELS,
  DRIVE_URL_ERROR,
  embedUrl,
  openUrl,
  parseDriveUrl,
} from "../src/lib/drive/links.ts";

const ID = "1AbCdEfGhIjKlMnOpQrStUvWxYz012345";
const SHORT_ID = "short";
const LONG_ID = "a".repeat(101);
const UNDERSCORE_ID = "AbCdEfGhIj_K-lMnOpQr";

let passed = 0;

function expectAccepted(input, kind, driveId) {
  const result = parseDriveUrl(input);

  assert.equal(result.ok, true, `Lien refusé à tort : ${input}`);

  if (!result.ok) {
    return;
  }

  assert.equal(result.link.kind, kind, `Type inattendu pour : ${input}`);
  assert.equal(
    result.link.driveId,
    driveId,
    `Identifiant inattendu pour : ${input}`,
  );
  passed += 1;
}

function expectRejected(input) {
  const result = parseDriveUrl(input);

  assert.equal(result.ok, false, `Lien accepté à tort : ${input}`);

  if (result.ok) {
    return;
  }

  assert.equal(
    result.error,
    DRIVE_URL_ERROR,
    `Message d'erreur inattendu pour : ${input}`,
  );
  passed += 1;
}

function expectEqual(actual, expected, label) {
  assert.equal(actual, expected, label);
  passed += 1;
}

// --- Liens acceptés ---------------------------------------------------
expectAccepted(`https://drive.google.com/file/d/${ID}`, "file", ID);
expectAccepted(
  `https://drive.google.com/file/d/${ID}/view`,
  "file",
  ID,
);
expectAccepted(
  `https://drive.google.com/file/d/${ID}/view?usp=sharing`,
  "file",
  ID,
);
expectAccepted(
  `  https://drive.google.com/file/d/${ID}/view  `,
  "file",
  ID,
);
expectAccepted(
  `https://DRIVE.GOOGLE.COM/file/d/${ID}/view`,
  "file",
  ID,
);
expectAccepted(
  `https://drive.google.com/file/d/${UNDERSCORE_ID}/view`,
  "file",
  UNDERSCORE_ID,
);

expectAccepted(
  `https://drive.google.com/drive/folders/${ID}`,
  "folder",
  ID,
);
expectAccepted(
  `https://drive.google.com/drive/folders/${ID}?usp=sharing`,
  "folder",
  ID,
);
expectAccepted(
  `https://drive.google.com/drive/u/0/folders/${ID}`,
  "folder",
  ID,
);
expectAccepted(
  `https://drive.google.com/drive/u/2/folders/${ID}?usp=drive_link`,
  "folder",
  ID,
);

expectAccepted(
  `https://docs.google.com/document/d/${ID}`,
  "document",
  ID,
);
expectAccepted(
  `https://docs.google.com/document/d/${ID}/view`,
  "document",
  ID,
);
expectAccepted(
  `https://docs.google.com/document/d/${ID}/edit?usp=sharing`,
  "document",
  ID,
);

expectAccepted(
  `https://docs.google.com/presentation/d/${ID}/view`,
  "presentation",
  ID,
);
expectAccepted(
  `https://docs.google.com/presentation/d/${ID}/edit#slide=id.p`,
  "presentation",
  ID,
);

expectAccepted(
  `https://docs.google.com/spreadsheets/d/${ID}/view`,
  "spreadsheet",
  ID,
);
expectAccepted(
  `https://docs.google.com/spreadsheets/d/${ID}/edit?usp=sharing`,
  "spreadsheet",
  ID,
);

// --- Liens refusés ----------------------------------------------------
expectRejected(`http://drive.google.com/file/d/${ID}/view`);
expectRejected(`https://drive.google.com.evil.com/file/d/${ID}/view`);
expectRejected(`https://docs.google.com.evil.com/document/d/${ID}/view`);
expectRejected(`https://evil.com/file/d/${ID}/view`);
expectRejected(`javascript:alert(1)`);
expectRejected(`data:text/html,<script>alert(1)</script>`);
expectRejected(`https://user:pass@drive.google.com/file/d/${ID}/view`);
expectRejected(`https://user@drive.google.com/file/d/${ID}/view`);
expectRejected(`https://drive.google.com@evil.com/file/d/${ID}/view`);
expectRejected(`https://drive.google.com/open?id=${ID}`);
expectRejected(`https://drive.google.com/file/d/${SHORT_ID}/view`);
expectRejected(`https://drive.google.com/file/d/${LONG_ID}/view`);
expectRejected(`https://drive.google.com/file/d/${ID}!/view`);
expectRejected(`https://drive.google.com/file/d/${ID}%20/view`);
expectRejected(`https://drive.google.com:8443/file/d/${ID}/view`);
expectRejected(`ftp://drive.google.com/file/d/${ID}/view`);
expectRejected(`https://drive.google.com/file/d/`);
expectRejected(`https://drive.google.com/drive/folders/`);
expectRejected(`https://drive.google.com/drive/folders/${ID}/extra`);
expectRejected(`https://drive.google.com/drive/u/abc/folders/${ID}`);
expectRejected(`https://drive.google.com/document/d/${ID}/view`);
expectRejected(`https://docs.google.com/file/d/${ID}/view`);
expectRejected(`https://docs.google.com/forms/d/${ID}/view`);
expectRejected("");
expectRejected("   ");
expectRejected("pas une adresse");

// --- URLs reconstruites ----------------------------------------------
expectEqual(
  embedUrl("file", ID),
  `https://drive.google.com/file/d/${ID}/preview`,
  "embedUrl fichier",
);
expectEqual(
  embedUrl("document", ID),
  `https://docs.google.com/document/d/${ID}/preview`,
  "embedUrl document",
);
expectEqual(
  embedUrl("spreadsheet", ID),
  `https://docs.google.com/spreadsheets/d/${ID}/preview`,
  "embedUrl feuille de calcul",
);
expectEqual(
  embedUrl("presentation", ID),
  `https://docs.google.com/presentation/d/${ID}/embed`,
  "embedUrl présentation",
);
expectEqual(
  embedUrl("folder", ID),
  `https://drive.google.com/embeddedfolderview?id=${ID}#list`,
  "embedUrl dossier",
);

expectEqual(
  openUrl("file", ID),
  `https://drive.google.com/file/d/${ID}/view`,
  "openUrl fichier",
);
expectEqual(
  openUrl("folder", ID),
  `https://drive.google.com/drive/folders/${ID}`,
  "openUrl dossier",
);
expectEqual(
  openUrl("document", ID),
  `https://docs.google.com/document/d/${ID}/view`,
  "openUrl document",
);
expectEqual(
  openUrl("presentation", ID),
  `https://docs.google.com/presentation/d/${ID}/view`,
  "openUrl présentation",
);
expectEqual(
  openUrl("spreadsheet", ID),
  `https://docs.google.com/spreadsheets/d/${ID}/view`,
  "openUrl feuille de calcul",
);

// --- Libellés et message ---------------------------------------------
expectEqual(DRIVE_KIND_LABELS.file, "Fichier", "libellé fichier");
expectEqual(DRIVE_KIND_LABELS.document, "Document", "libellé document");
expectEqual(
  DRIVE_KIND_LABELS.presentation,
  "Présentation",
  "libellé présentation",
);
expectEqual(
  DRIVE_KIND_LABELS.spreadsheet,
  "Feuille de calcul",
  "libellé feuille de calcul",
);
expectEqual(DRIVE_KIND_LABELS.folder, "Dossier", "libellé dossier");
expectEqual(
  DRIVE_URL_ERROR,
  "Ce lien n'est pas un lien Google Drive valide. Utilisez le lien de partage complet (Partager, puis Copier le lien).",
  "message d'erreur",
);

console.log(`${passed} vérifications réussies.`);
