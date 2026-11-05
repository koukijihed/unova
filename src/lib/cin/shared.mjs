import { createHmac } from "node:crypto";

const LATIN_OR_ARABIC_LETTER = /[\p{Script=Latin}\p{Script=Arabic}]/u;
const UNICODE_LETTER = /\p{L}/u;
const COMBINING_MARK = /\p{M}/gu;

/**
 * Conserve uniquement les chiffres du CIN.
 * Les zéros initiaux sont préservés.
 *
 * @param {string} input
 * @returns {string}
 */
export function normalizeCin(input) {
  return String(input ?? "").replace(/\D/g, "");
}

/**
 * Normalise un nom pour la comparaison avec la liste officielle.
 * Supprime les accents, la casse et les caractères non alphabétiques.
 * Seules les lettres latines et arabes sont conservées.
 *
 * @param {string} input
 * @returns {string}
 */
export function normalizeName(input) {
  const decomposed = String(input ?? "")
    .trim()
    .normalize("NFD")
    .replace(COMBINING_MARK, "")
    .toLowerCase();

  return Array.from(decomposed)
    .filter(
      (character) =>
        UNICODE_LETTER.test(character) &&
        LATIN_OR_ARABIC_LETTER.test(character),
    )
    .join("");
}

/**
 * Calcule l'empreinte HMAC-SHA256 du CIN normalisé.
 * Le CIN en clair et l'empreinte ne doivent jamais être exposés au navigateur.
 *
 * @param {string} cin
 * @param {string} pepper
 * @returns {string}
 */
export function hashCin(cin, pepper) {
  if (!pepper) {
    throw new Error("CIN_PEPPER manquant.");
  }

  return createHmac("sha256", pepper)
    .update(normalizeCin(cin), "utf8")
    .digest("hex");
}

/**
 * Vérifie qu'un CIN contient exactement 8 chiffres après normalisation.
 *
 * @param {string} input
 * @returns {boolean}
 */
export function isValidCin(input) {
  return /^\d{8}$/.test(normalizeCin(input));
}
