import "server-only";
import crypto from "crypto";

/** Password temporanea casuale di 12 caratteri, mostrata una sola volta. */
export function generateTemporaryPassword(): string {
  const chars =
    "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const symbols = "!@#$%&*";
  const bytes = crypto.randomBytes(12);
  const value = Array.from(
    { length: 10 },
    (_, index) => chars[bytes[index]! % chars.length]
  );
  value.push(symbols[bytes[10]! % symbols.length]!);
  value.push(String(bytes[11]! % 10));

  const shuffle = crypto.randomBytes(value.length);
  for (let index = value.length - 1; index > 0; index -= 1) {
    const target = shuffle[index]! % (index + 1);
    [value[index], value[target]] = [value[target]!, value[index]!];
  }

  return value.join("");
}

export function slugifyUsername(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}
