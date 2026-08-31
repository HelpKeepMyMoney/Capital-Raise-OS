import { redirect } from "next/navigation";

/** Legacy path mentioned in product copy — API keys live on main Settings. */
export default function SettingsApiRedirectPage() {
  redirect("/settings");
}
