import { useEffect, useRef, type ReactNode } from "react";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { useAwaitQueue, useAwaitTrigger } from "~/hooks/useAwaitTrigger";

export default function Page(): ReactNode {
   const inputRef = useRef<HTMLInputElement>(null);
   const { wait: waitForClick, resolve: clickHappened } = useAwaitTrigger();
   const { get, resolve } = useAwaitQueue<string>();

   useEffect(() => {
      async function foo(): Promise<void> {
         for await (const str of get()) {
            console.log(str);
         }
      }
      foo()
         .then(() => console.log("done"))
         .catch((err) => console.error(err));
   }, [get]);

   return (
      <div className="flex gap-4">
         <Button
            onClick={async () => {
               console.log("Gonna wait…");
               await waitForClick();
               console.log("Done!");
            }}
         >
            Start
         </Button>

         <Button
            onClick={() => {
               clickHappened();
            }}
         >
            Finish
         </Button>

         <Input ref={inputRef} />
         <Button onClick={() => resolve(inputRef.current?.value ?? "nothing")}>
            Get
         </Button>
      </div>
   );
}
