import { redirect } from "next/navigation";

const TAB_MAP: Record<string, string> = {
  categorias: "categorias",
  contas: "contas",
  cartoes: "cartoes",
  formas: "formas",
};

export default async function InstrumentsRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const targetTab = params.tab && TAB_MAP[params.tab] ? TAB_MAP[params.tab] : "categorias";
  redirect(`/dashboard/settings?tab=${targetTab}`);
}
