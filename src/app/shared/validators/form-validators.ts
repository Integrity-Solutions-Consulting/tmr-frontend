// Validators compartidos de TMR Frontend

/** Solo letras y espacios (sin números ni caracteres especiales) */
export const ONLY_LETTERS_REGEX = /^[a-zA-ZÀ-ÿ\s]+$/;

/** Nombre de usuario: letras, números, puntos y guiones bajos */
export const USERNAME_REGEX = /^[a-zA-Z0-9._]+$/;

/** Email estándar */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Solo números positivos */
export const NUMBERS_ONLY_REGEX = /^\d+$/;
