import { type ReactNode, useState } from "react";
import { useToast } from "~/components/ui/Toast";
import { cardClass, outlineButton, primaryButton } from "~/components/ui/styles";
import { formatName, type GeneratedName, generateName } from "~/utils/name-generator";
import type { Route } from "./+types/new-name";

export function meta({}: Route.MetaArgs): ReturnType<Route.MetaFunction> {
   return [{ title: "New name" }];
}

// The first name comes from the server so the page doesn't change on hydration.
export function loader(): { name: GeneratedName } {
   return { name: generateName() };
}

export default function NewName({ loaderData }: Route.ComponentProps): ReactNode {
   const [generated, setGenerated] = useState(loaderData.name);
   const name = formatName(generated);
   const { showToast } = useToast();

   const next = (): void => {
      let fresh = generateName();
      while (formatName(fresh) === name) fresh = generateName();
      setGenerated(fresh);
   };

   const copy = async (): Promise<void> => {
      try {
         await navigator.clipboard.writeText(name);
         showToast("success", `Copied ${name}`);
      } catch {
         showToast("error", "Couldn’t copy the name");
      }
   };

   return (
      <div className="space-y-8">
         <div className="space-y-2">
            <h1 className="font-title text-3xl">New name</h1>
            <p className="text-muted-fg">
               Sometimes a real name, sometimes one made up from syllables.
            </p>
         </div>
         <div className={`${cardClass} flex flex-col items-center gap-8 px-6 py-12`}>
            <p
               className="text-center font-title text-3xl break-words sm:text-5xl"
               aria-live="polite"
               lang={generated.lang ?? undefined}
            >
               {name}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
               <button type="button" className={primaryButton} onClick={next}>
                  New name
               </button>
               <button
                  type="button"
                  className={outlineButton}
                  onClick={() => void copy()}
               >
                  <CopyIcon />
                  Copy
               </button>
            </div>
         </div>
      </div>
   );
}

function CopyIcon(): ReactNode {
   return (
      <svg
         viewBox="0 0 24 24"
         fill="none"
         stroke="currentColor"
         strokeWidth={2}
         strokeLinecap="round"
         strokeLinejoin="round"
         aria-hidden="true"
      >
         <rect x="9" y="9" width="13" height="13" rx="2" />
         <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </svg>
   );
}
