export type DetectedImageType = {
  ext: "png" | "jpg" | "webp";
  mime: "image/png" | "image/jpeg" | "image/webp";
};

function startsWith(
  bytes: Uint8Array,
  signature: number[],
  offset = 0,
): boolean {
  if (bytes.length < offset + signature.length) {
    return false;
  }

  return signature.every(
    (value, index) => bytes[offset + index] === value,
  );
}

/**
 * Détecte le type réel de l'image à partir de ses premiers octets.
 * Ne se fie jamais à l'extension ni au Content-Type envoyé par le client.
 */
export function detectImageType(
  bytes: Uint8Array,
): DetectedImageType | null {
  if (
    startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  ) {
    return { ext: "png", mime: "image/png" };
  }

  if (startsWith(bytes, [0xff, 0xd8, 0xff])) {
    return { ext: "jpg", mime: "image/jpeg" };
  }

  if (
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)
  ) {
    return { ext: "webp", mime: "image/webp" };
  }

  return null;
}
