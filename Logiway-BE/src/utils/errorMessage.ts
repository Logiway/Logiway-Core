import { redactString } from "./redaction.js";

const MAX_ERROR_MESSAGE_LENGTH = 200;

function removeControlCharacters(value: string): string {
  let result = "";
  for (const character of value) {
    const code = character.charCodeAt(0);
    result += code <= 31 || code === 127 ? " " : character;
  }
  return result;
}

export function errorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "Unknown error";
  return removeControlCharacters(redactString(message))
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_ERROR_MESSAGE_LENGTH) || "Unknown error";
}
