declare module "https://deno.land/std@0.224.0/http/server.ts" {
  export type ServeHandler = (request: Request) => Response | Promise<Response>;

  export function serve(handler: ServeHandler): void;
}

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};
