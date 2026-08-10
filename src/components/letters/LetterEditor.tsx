import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { Button } from "@/components/ui/button";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Heading2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const SYSTEM_FIELDS = [
  "Employee_ID",
  "Employee_Name",
  "Employee_Email",
  "Designation",
  "Department",
  "Old_CTC",
  "New_CTC",
  "Increment_Percent",
  "Effective_Date",
  "PDF_Password",
  "Manager_Name",
];

export function LetterEditor({
  content,
  onChange,
  className,
}: {
  content: any;
  onChange: (json: any) => void;
  className?: string;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: content || { type: "doc", content: [{ type: "paragraph" }] },
    onUpdate: ({ editor: ed }) => onChange(ed.getJSON()),
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none min-h-[320px] focus:outline-none px-4 py-3",
      },
    },
  });

  if (!editor) return null;

  const insertToken = (token: string) => {
    editor.chain().focus().insertContent(`{{${token}}}`).run();
  };

  const insertBlock = (kind: "signature" | "footer" | "salary") => {
    if (kind === "signature") {
      editor
        .chain()
        .focus()
        .insertContent([
          { type: "paragraph", content: [{ type: "text", text: "Warm regards," }] },
          { type: "paragraph", content: [{ type: "text", text: "{{Manager_Name}}" }] },
        ])
        .run();
    } else if (kind === "footer") {
      editor
        .chain()
        .focus()
        .insertContent({
          type: "paragraph",
          content: [
            {
              type: "text",
              marks: [{ type: "italic" }],
              text: "This letter is confidential and intended solely for the named employee.",
            },
          ],
        })
        .run();
    } else {
      editor
        .chain()
        .focus()
        .insertContent([
          {
            type: "paragraph",
            content: [
              { type: "text", marks: [{ type: "bold" }], text: "Previous CTC: " },
              { type: "text", text: "{{Old_CTC}}" },
            ],
          },
          {
            type: "paragraph",
            content: [
              { type: "text", marks: [{ type: "bold" }], text: "Revised CTC: " },
              { type: "text", text: "{{New_CTC}}" },
            ],
          },
          {
            type: "paragraph",
            content: [
              { type: "text", marks: [{ type: "bold" }], text: "Increment: " },
              { type: "text", text: "{{Increment_Percent}}%" },
            ],
          },
        ])
        .run();
    }
  };

  return (
    <div className={cn("rounded-xl border bg-background", className)}>
      <div className="flex flex-wrap items-center gap-1 border-b bg-muted/40 px-2 py-1.5">
        <ToolBtn active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="size-3.5" />
        </ToolBtn>
        <ToolBtn active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="size-3.5" />
        </ToolBtn>
        <ToolBtn active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon className="size-3.5" />
        </ToolBtn>
        <ToolBtn active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 className="size-3.5" />
        </ToolBtn>
        <ToolBtn active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List className="size-3.5" />
        </ToolBtn>
        <ToolBtn active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="size-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign("left").run()}>
          <AlignLeft className="size-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign("center").run()}>
          <AlignCenter className="size-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign("right").run()}>
          <AlignRight className="size-3.5" />
        </ToolBtn>

        <div className="mx-1 h-5 w-px bg-border" />

        <select
          className="h-7 rounded-md border bg-background px-2 text-xs"
          defaultValue=""
          onChange={(e) => {
            if (e.target.value) insertToken(e.target.value);
            e.target.value = "";
          }}
        >
          <option value="" disabled>
            Insert field…
          </option>
          {SYSTEM_FIELDS.map((f) => (
            <option key={f} value={f}>
              {`{{${f}}}`}
            </option>
          ))}
        </select>

        <select
          className="h-7 rounded-md border bg-background px-2 text-xs"
          defaultValue=""
          onChange={(e) => {
            if (e.target.value) insertBlock(e.target.value as any);
            e.target.value = "";
          }}
        >
          <option value="" disabled>
            Insert block…
          </option>
          <option value="salary">Salary table</option>
          <option value="signature">Signature</option>
          <option value="footer">Confidential footer</option>
        </select>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

function ToolBtn({
  children,
  onClick,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? "secondary" : "ghost"}
      className="h-7 w-7 p-0"
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

export { SYSTEM_FIELDS };
