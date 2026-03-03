import { redirect } from "next/navigation";

// Sign-up is no longer available — users are invited by admins/managers.
// Redirect any old bookmarks to login.
export default function Page() {
  redirect("/login");
}
