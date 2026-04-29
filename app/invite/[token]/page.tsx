import { InviteClient } from "./invite-client";

export default async function InvitePage(props: { params: Promise<{ token: string }> }) {
  const { token } = await props.params;
  return (
    <div className="min-h-screen bg-background flex flex-col justify-center border-t border-border">
      <InviteClient token={decodeURIComponent(token)} />
    </div>
  );
}
