export function extraError(): void {
  const err = new Error("extraError boom");
  throw err;
}

