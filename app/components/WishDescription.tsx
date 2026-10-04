import React, { type JSX } from "react";
import Markdown, { type Components } from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";

// Descriptions are short, so headings render as bold text rather than big titles.
function Heading({ children }: { children?: React.ReactNode }): JSX.Element {
   return <p className="font-semibold text-wl-fg">{children}</p>;
}

const components: Components = {
   h1: Heading,
   h2: Heading,
   h3: Heading,
   h4: Heading,
   h5: Heading,
   h6: Heading,
   a: ({ href, children }) => (
      <a
         href={href}
         target="_blank"
         rel="noopener noreferrer nofollow"
         className="font-medium text-wl-fg underline underline-offset-4"
      >
         {children}
      </a>
   ),
   strong: ({ children }) => (
      <strong className="font-semibold text-wl-fg">{children}</strong>
   ),
   ul: ({ children }) => <ul className="list-disc pl-5">{children}</ul>,
   ol: ({ children }) => <ol className="list-decimal pl-5">{children}</ol>,
   blockquote: ({ children }) => (
      <blockquote className="border-l-2 border-wl-border pl-3">{children}</blockquote>
   ),
   code: ({ children }) => (
      <code className="rounded-sm bg-wl-muted px-1 py-0.5 text-[0.85em]">
         {children}
      </code>
   ),
   pre: ({ children }) => <pre className="overflow-x-auto">{children}</pre>,
   hr: () => <hr className="border-wl-border" />,
   // Pictures from arbitrary hosts don't belong on the list; show the alt text.
   img: ({ alt }) => <>{alt}</>,
};

/**
 * A wish's description, written in markdown. Raw HTML in the source is shown as
 * text, and single line breaks stay line breaks, as they did before markdown.
 */
export function WishDescription({ children }: { children: string }): JSX.Element {
   return (
      <div className="flex flex-col gap-2 text-sm leading-relaxed break-words text-wl-muted-fg">
         <Markdown remarkPlugins={[remarkGfm, remarkBreaks]} components={components}>
            {children}
         </Markdown>
      </div>
   );
}
