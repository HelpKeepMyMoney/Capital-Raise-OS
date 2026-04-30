import { EsignSignClient } from "@/components/esign/esign-sign-client";

export default async function SignPage(props: { searchParams?: Promise<{ token?: string }> }) {
  const sp = props.searchParams ? await props.searchParams : {};
  const token = typeof sp.token === "string" ? sp.token : "";
  return (
    <div className="min-h-screen bg-muted/30 py-10 px-4">
      <div className="mx-auto max-w-lg">
        <EsignSignClient initialToken={token} />
      </div>
    </div>
  );
}
