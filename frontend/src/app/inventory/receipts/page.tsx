import { redirect } from "next/navigation";

export default function InventoryReceiptsRedirect() {
  redirect("/purchasing/receipts");
}
