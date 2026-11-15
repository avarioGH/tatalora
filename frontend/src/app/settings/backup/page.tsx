import { redirect } from "next/navigation"

export default function SettingsBackupRedirect() {
  redirect("/settings/database")
}
