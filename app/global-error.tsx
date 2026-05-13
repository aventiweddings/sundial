'use client';

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  return (
    <html>
      <body style={{ padding: 40, fontFamily: 'monospace' }}>
        <h1>Application Error</h1>
        <pre style={{ whiteSpace: 'pre-wrap', background: '#f5f5f5', padding: 20 }}>
          {error.message}
          {'\n\n'}
          {error.stack}
          {'\n\n'}
          Digest: {error.digest}
        </pre>
      </body>
    </html>
  );
}
