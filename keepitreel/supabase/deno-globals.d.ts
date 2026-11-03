/** Type-only Deno host surface for local tsc checks; actual deployment uses Deno's own types. */
declare namespace Deno {
  const env: { get(name: string): string | undefined };
  function serve(handler: (request: Request) => Response | Promise<Response>): unknown;
}
