import { Node, mergeAttributes } from "@tiptap/core"

export const SignatureExtension = Node.create({
  name: "signature",
  group: "block",
  content: "inline*",
  selectable: false,
  draggable: false,
  isolating: true,

  addAttributes() {
    return {
      html: { default: "" },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-signature]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-signature": "true",
        contenteditable: "false",
        class: "border-t border-slate-200 pt-3 mt-4 text-xs text-slate-400 select-none",
      }),
      ["div", { class: "signature-content" }, 0],
    ]
  },
})
