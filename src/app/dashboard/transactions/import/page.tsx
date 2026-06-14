import { redirect } from "next/navigation";

export const metadata = {
  title: "Importar Extrato | Logos Financeiro",
  description: "Faça upload de arquivos OFX e CSV para conciliação bancária.",
};

export default async function ImportStatementPage() {
  redirect("/dashboard/statements?tab=import");
}
