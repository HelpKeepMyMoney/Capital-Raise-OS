import { EsignSignClient } from "@/components/esign/esign-sign-client";

export default async function SignPage(props: { searchParams?: Promise<{ token?: string }> }) {
  const sp = props.searchParams ? await props.searchParams : {};
  const token = typeof sp.token === "string" ? sp.token : "";
  return (
    <div className="min-h-screen bg-muted/30 py-6 px-4 md:py-10">
      <div className="mx-auto max-w-[92rem] px-1 sm:px-0">
        <EsignSignClient initialToken={token} />
      </div>
    </div>
  );
}
