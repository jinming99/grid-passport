import { redirect } from "next/navigation";
import { DEFAULT_CASE_ID } from "@grid-passport/core/fixtures";

export default function DemoIndex() {
  redirect(`/demo/${DEFAULT_CASE_ID}`);
}
