import { atom, useAtom } from "jotai"

export type Folder =
  | "inbox"
  | "drafts"
  | "sent"
  | "junk"
  | "trash"
  | "archive"
  | "social"
  | "updates"
  | "forums"
  | "shopping"
  | "promotions"

type Config = {
  selected: string | null
  folder: Folder
}

const configAtom = atom<Config>({
  selected: null,
  folder: "inbox",
})

export function useMail() {
  return useAtom(configAtom)
}
