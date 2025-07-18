import { useMemo, useRef } from "react";

export function useAwaitTrigger<T = void>(): {
   wait: () => Promise<T>;
   resolve: (val: T) => void;
} {
   const resolveRef = useRef<(val: T) => void | null>(null);

   return useMemo(
      () => ({
         wait: async () => {
            let resolve: (val: T) => void;
            const promise = new Promise<T>((r) => {
               resolve = r;
            });
            resolveRef.current = resolve!;
            return promise;
         },
         resolve: (val: T) => {
            if (resolveRef.current) {
               const resolve = resolveRef.current;
               resolveRef.current = null;
               resolve(val);
            }
         },
      }),
      [],
   );
}

export function useAwaitQueue<T>(): {
   get: () => AsyncGenerator<T>;
   resolve: (val: T) => void;
} {
   const resolversRef = useRef<Array<(val: T) => void>>([]);

   return useMemo(
      () => ({
         get: async function* () {
            for (;;) {
               let resolve: (val: T) => void;
               const promise = new Promise<T>((r) => {
                  resolve = r;
               });
               resolversRef.current.push(resolve!);
               const value = await promise;
               yield value;
            }
         },
         resolve: (val: T) => {
            if (resolversRef.current.length > 0) {
               const next = resolversRef.current.shift();
               next!(val);
            }
         },
      }),
      [],
   );
}
