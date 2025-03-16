import { Button, Input } from "antd";
import { useState, type ReactNode } from "react";

export default function Ugh(): ReactNode {
  const [text, setText] = useState("");

  return (
    <div>
      <Input value={text} onChange={(e) => setText(e.target.value)} />
      <Button
        onClick={() => {
          throw new Error(text);
        }}
      >
        Report
      </Button>
    </div>
  );
}
