/**
 * POSIX-safe single-quoting for shell command strings.
 *
 * Wraps the input in single quotes and escapes any embedded single quotes
 * using the standard close-escape-reopen technique: ' -> '\''
 *
 * Safe for /bin/sh, bash, and zsh. Neutralises $(), backticks, and all
 * other shell metacharacters (they are literal inside single quotes).
 */
export function posixQuote(raw: string): string {
  return `'${raw.replace(/'/g, "'\\''")}'`;
}
