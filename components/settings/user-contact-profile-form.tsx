"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function UserContactProfileForm(props: {
  accountEmail: string;
  initialDisplayName?: string;
  initialPhone?: string;
  initialTitle?: string;
  initialStreet1?: string;
  initialStreet2?: string;
  initialCity?: string;
  initialRegion?: string;
  initialPostalCode?: string;
  initialCountry?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [phone, setPhone] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [street1, setStreet1] = React.useState("");
  const [street2, setStreet2] = React.useState("");
  const [city, setCity] = React.useState("");
  const [region, setRegion] = React.useState("");
  const [postalCode, setPostalCode] = React.useState("");
  const [country, setCountry] = React.useState("");

  React.useEffect(() => {
    setPhone(props.initialPhone ?? "");
    setTitle(props.initialTitle ?? "");
    setStreet1(props.initialStreet1 ?? "");
    setStreet2(props.initialStreet2 ?? "");
    setCity(props.initialCity ?? "");
    setRegion(props.initialRegion ?? "");
    setPostalCode(props.initialPostalCode ?? "");
    setCountry(props.initialCountry ?? "");
  }, [
    props.initialPhone,
    props.initialTitle,
    props.initialStreet1,
    props.initialStreet2,
    props.initialCity,
    props.initialRegion,
    props.initialPostalCode,
    props.initialCountry,
  ]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      const res = await fetch("/api/me/contact", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phone.trim() || undefined,
          title: title.trim() || undefined,
          street1: street1.trim() || undefined,
          street2: street2.trim() || undefined,
          city: city.trim() || undefined,
          region: region.trim() || undefined,
          postalCode: postalCode.trim() || undefined,
          country: country.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Update failed");
      toast.success("Your profile was updated");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Account email</Label>
          <Input value={props.accountEmail} disabled className="bg-muted/50" />
          <p className="text-[11px] text-muted-foreground">Managed by your login provider.</p>
        </div>
        <div className="space-y-2">
          <Label>Display name</Label>
          <Input value={props.initialDisplayName ?? ""} disabled className="bg-muted/50" />
          <p className="text-[11px] text-muted-foreground">From your account; used on certificates.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="me-phone">Phone</Label>
          <Input id="me-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={pending} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="me-title">Title</Label>
          <Input id="me-title" value={title} onChange={(e) => setTitle(e.target.value)} disabled={pending} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="me-street1">Street address line 1</Label>
          <Input id="me-street1" value={street1} onChange={(e) => setStreet1(e.target.value)} disabled={pending} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="me-street2">Street address line 2</Label>
          <Input id="me-street2" value={street2} onChange={(e) => setStreet2(e.target.value)} disabled={pending} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="me-city">City</Label>
          <Input id="me-city" value={city} onChange={(e) => setCity(e.target.value)} disabled={pending} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="me-region">State / region</Label>
          <Input id="me-region" value={region} onChange={(e) => setRegion(e.target.value)} disabled={pending} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="me-postal">Postal code</Label>
          <Input id="me-postal" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} disabled={pending} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="me-country">Country</Label>
          <Input id="me-country" value={country} onChange={(e) => setCountry(e.target.value)} disabled={pending} />
        </div>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}
