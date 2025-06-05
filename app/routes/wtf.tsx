import { useState, type ReactNode } from "react";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";

export default function Ugh(): ReactNode {
  const [text, setText] = useState("");

  return (
    <div className="space-y-4">
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Enter error message"
      />
      <Button
        variant="danger"
        onClick={() => {
          throw new Error(text);
        }}
      >
        Report
      </Button>
    </div>
  );
}
