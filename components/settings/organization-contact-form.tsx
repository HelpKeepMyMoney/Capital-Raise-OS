"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { OrgContact } from "@/lib/firestore/types";

function emptyContact(): OrgContact {
  return {};
}

export function OrganizationContactForm(props: {
  organizationId: string;
  orgName: string;
  orgSlug: string;
  initialContact?: OrgContact;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [legalName, setLegalName] = React.useState("");
  const [street1, setStreet1] = React.useState("");
  const [street2, setStreet2] = React.useState("");
  const [city, setCity] = React.useState("");
  const [region, setRegion] = React.useState("");
  const [postalCode, setPostalCode] = React.useState("");
  const [country, setCountry] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [cpName, setCpName] = React.useState("");
  const [cpTitle, setCpTitle] = React.useState("");
  const [cpEmail, setCpEmail] = React.useState("");
  const [cpPhone, setCpPhone] = React.useState("");

  React.useEffect(() => {
    const c = props.initialContact ?? emptyContact();
    const p = c.contactPerson;
    setLegalName(c.legalName ?? "");
    setStreet1(c.street1 ?? "");
    setStreet2(c.street2 ?? "");
    setCity(c.city ?? "");
    setRegion(c.region ?? "");
    setPostalCode(c.postalCode ?? "");
    setCountry(c.country ?? "");
    setPhone(c.phone ?? "");
    setCpName(p?.name ?? "");
    setCpTitle(p?.title ?? "");
    setCpEmail(p?.email ?? "");
    setCpPhone(p?.phone ?? "");
  }, [props.initialContact]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!props.canEdit) return;
    setPending(true);
    try {
      const contact: OrgContact = {
        legalName: legalName.trim() || undefined,
        street1: street1.trim() || undefined,
        street2: street2.trim() || undefined,
        city: city.trim() || undefined,
        region: region.trim() || undefined,
        postalCode: postalCode.trim() || undefined,
        country: country.trim() || undefined,
        phone: phone.trim() || undefined,
        contactPerson:
          cpName.trim() || cpTitle.trim() || cpEmail.trim() || cpPhone.trim()
            ? {
                name: cpName.trim() || undefined,
                title: cpTitle.trim() || undefined,
                email: cpEmail.trim() || undefined,
                phone: cpPhone.trim() || undefined,
              }
            : undefined,
      };
      const res = await fetch(`/api/organizations/${encodeURIComponent(props.organizationId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: props.orgName,
          slug: props.orgSlug,
          contact,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Update failed");
      toast.success("Organization contact saved");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="border-t border-border pt-6 space-y-4">
      <div>
        <h3 className="text-sm font-medium text-foreground">Organization contact</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Used for notices and can auto-fill sponsor fields on signable templates when field IDs match merge keys (see E-sign
          templates).
        </p>
      </div>
      <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="org-legal">Legal entity name</Label>
            <Input
              id="org-legal"
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              disabled={!props.canEdit || pending}
              autoComplete="organization"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="org-street1">Street address line 1</Label>
            <Input
              id="org-street1"
              value={street1}
              onChange={(e) => setStreet1(e.target.value)}
              disabled={!props.canEdit || pending}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="org-street2">Street address line 2</Label>
            <Input
              id="org-street2"
              value={street2}
              onChange={(e) => setStreet2(e.target.value)}
              disabled={!props.canEdit || pending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-city">City</Label>
            <Input id="org-city" value={city} onChange={(e) => setCity(e.target.value)} disabled={!props.canEdit || pending} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-region">State / region</Label>
            <Input
              id="org-region"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              disabled={!props.canEdit || pending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-postal">Postal code</Label>
            <Input
              id="org-postal"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              disabled={!props.canEdit || pending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-country">Country</Label>
            <Input
              id="org-country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              disabled={!props.canEdit || pending}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="org-phone">Organization phone</Label>
            <Input
              id="org-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={!props.canEdit || pending}
            />
          </div>
        </div>
        <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-4">
          <p className="text-xs font-medium text-foreground">Primary contact person</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cp-name">Name</Label>
              <Input
                id="cp-name"
                value={cpName}
                onChange={(e) => setCpName(e.target.value)}
                disabled={!props.canEdit || pending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cp-title">Title</Label>
              <Input
                id="cp-title"
                value={cpTitle}
                onChange={(e) => setCpTitle(e.target.value)}
                disabled={!props.canEdit || pending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cp-email">Email</Label>
              <Input
                id="cp-email"
                type="email"
                value={cpEmail}
                onChange={(e) => setCpEmail(e.target.value)}
                disabled={!props.canEdit || pending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cp-phone">Phone</Label>
              <Input
                id="cp-phone"
                type="tel"
                value={cpPhone}
                onChange={(e) => setCpPhone(e.target.value)}
                disabled={!props.canEdit || pending}
              />
            </div>
          </div>
        </div>
        {props.canEdit ? (
          <Button type="submit" disabled={pending} variant="secondary">
            {pending ? "Saving…" : "Save organization contact"}
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">Only founders and admins can edit organization contact.</p>
        )}
      </form>
    </div>
  );
}
