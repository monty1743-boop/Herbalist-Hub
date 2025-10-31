import { Metadata } from "next"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "Sign Up | HerbalistHub",
  description: "Create your HerbalistHub account",
}

export default function SignUpPage() {
  // Redirect to register page
  redirect("/auth/register")
}