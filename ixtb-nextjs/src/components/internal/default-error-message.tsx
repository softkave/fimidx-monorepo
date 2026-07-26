export const kSupportEmail = "abayomi@fimidara.com";

export function SupportEmailLink() {
  return <a href={`mailto:${kSupportEmail}`}>{kSupportEmail}</a>;
}

/** Generic "contact us" fallback used by `/error` and unknown auth errors. */
export function DefaultErrorMessage() {
  return (
    <p>
      Please contact us at <SupportEmailLink /> if this error persists.
    </p>
  );
}

/** Production copy for route / global render failures. */
export function UnexpectedErrorMessage() {
  return (
    <p>
      We hit an unexpected error. Retrying may fix it — please contact us at{" "}
      <SupportEmailLink /> if it persists.
    </p>
  );
}
