export function rootError(): void {
  const err = new Error("rootError boom");
  throw err;
}

