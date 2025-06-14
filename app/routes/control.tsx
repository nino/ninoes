import React, {
  useState,
  useRef,
  useLayoutEffect,
  type ReactNode,
} from "react";
import { Input } from "~/components/ui/Input";

export default function Page(): ReactNode {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const cursorPositionRef = useRef<number | null>(null);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const input = event.currentTarget;
    cursorPositionRef.current = input.selectionStart;
    const newValue = input.value.toUpperCase();

    setText(newValue);
  };

  useLayoutEffect(() => {
    if (inputRef.current && cursorPositionRef.current !== null) {
      inputRef.current.setSelectionRange(
        cursorPositionRef.current,
        cursorPositionRef.current
      );
    }
  });

  return (
    <div>
      hi
      <Input ref={inputRef} value={text} onChange={handleChange} />
    </div>
  );
}
