import { redirect } from "next/navigation";

export default function ProductionWorkOrdersRedirect() {
  redirect("/inventory/production/create");
}
