import { useLocale } from "../i18n/react";
import { SelectField } from "./ui/select-field";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card } from "./ui/card";
import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetPlayerProfileQueryKey,
  useUpdatePlayerProfile,
} from "../api/generated/tito";
import type {
  PlayerProfile,
  UpdatePlayerProfile,
} from "../api/generated/models";
import { copy } from "../i18n";
import { RequestError } from "./shared";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "./ui/select";

export function PlayerPreferences({
  userId,
  profile,
}: {
  userId: string;
  profile: PlayerProfile;
}) {
  useLocale();
  const client = useQueryClient();
  // Only edited fields live in the draft. Pristine fields follow refreshed server data.
  const [draft, setDraft] = useState<Partial<UpdatePlayerProfile>>({});
  const accountId =
    (draft.accountId === undefined ? profile.accountId : draft.accountId) ?? "";
  const role =
    (draft.role === undefined ? profile.role : draft.role)?.toString() ?? "";
  const experience =
    (draft.experience === undefined ? profile.experience : draft.experience) ??
    "";
  const mutation = useUpdatePlayerProfile({
    mutation: {
      onSuccess(saved) {
        client.setQueryData([...getGetPlayerProfileQueryKey(), userId], saved);
        setDraft({});
      },
    },
  });

  function edit(values: Partial<UpdatePlayerProfile>) {
    setDraft((previous) => ({ ...previous, ...values }));
    mutation.reset();
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    mutation.mutate({
      data: {
        accountId: accountId.trim() || null,
        role: role ? Number(role) : null,
        experience: experience || null,
      },
    });
  }

  return (
    <Card render={<section />} className="preferences-panel min-w-0">
      <h2>{copy.profile.title}</h2>
      <p className="muted text-muted-foreground text-[13px] leading-[1.8] mt-4 mx-0 mb-6 wrap-anywhere">
        {copy.profile.description}
      </p>
      <form className="grid gap-5.5 [&_>_.notice]:m-0" onSubmit={submit}>
        <div className="preference-field min-w-0">
          <Label htmlFor="profile-id">{copy.profile.accountId}</Label>
          <Input
            id="profile-id"
            inputMode="numeric"
            autoComplete="off"
            pattern="[0-9]{1,17}"
            value={accountId}
            placeholder={copy.home.placeholder}
            onChange={(event) => {
              edit({ accountId: event.target.value });
            }}
            aria-describedby="profile-id-hint"
            disabled={mutation.isPending}
          />
          <p
            id="profile-id-hint"
            className="field-hint text-muted-foreground text-[12px] leading-[1.7] mt-3 mx-0 mb-0"
          >
            {profile.linkedAccountId
              ? copy.profile.connectedHint
              : copy.profile.manualHint}
          </p>
        </div>
        <div
          className={
            "preference-columns grid grid-cols-2 gap-4.5 max-[580px]:grid-cols-1 max-[580px]:gap-5.5"
          }
        >
          <SelectField className="preference-field min-w-0">
            <Label htmlFor="profile-role">{copy.profile.role}</Label>
            <Select
              value={role}
              items={[
                { value: "", label: copy.profile.chooseLater },
                ...copy.profile.roles.map((item) => ({
                  ...item,
                  value: String(item.value),
                })),
              ]}
              onValueChange={(value) => {
                edit({
                  role: value ? Number(value) : null,
                });
              }}
              disabled={mutation.isPending}
            >
              <SelectTrigger id="profile-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="start" alignItemWithTrigger={false}>
                <SelectItem value="">{copy.profile.chooseLater}</SelectItem>
                {copy.profile.roles.map(({ value, label }) => (
                  <SelectItem key={value} value={String(value)}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SelectField>
          <SelectField className="preference-field min-w-0">
            <Label htmlFor="profile-experience">
              {copy.profile.experience}
            </Label>
            <Select
              value={experience}
              items={[
                { value: "", label: copy.profile.chooseLater },
                ...copy.profile.levels,
              ]}
              onValueChange={(value) => {
                if (
                  value === "" ||
                  value === "beginner" ||
                  value === "intermediate" ||
                  value === "advanced"
                )
                  edit({ experience: value || null });
              }}
              disabled={mutation.isPending}
            >
              <SelectTrigger id="profile-experience">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="start" alignItemWithTrigger={false}>
                <SelectItem value="">{copy.profile.chooseLater}</SelectItem>
                {copy.profile.levels.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SelectField>
        </div>
        <div className={"preference-actions flex items-center flex-wrap gap-6"}>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? copy.profile.saving : copy.profile.save}
          </Button>
          {profile.accountId ? (
            <Link
              className={
                "text-link inline-flex items-center gap-1.75 text-primary text-[12px] [@media(hover:_hover)]:[&:hover]:text-foreground"
              }
              to={`/?player=${profile.accountId}`}
            >
              {copy.profile.myMatches} ↗
            </Link>
          ) : null}
        </div>
        {mutation.isSuccess ? (
          <p
            className="save-feedback text-[var(--success)] text-[13px] m-0"
            role="status"
          >
            {copy.profile.saved}
          </p>
        ) : null}
        {mutation.isError ? <RequestError error={mutation.error} /> : null}
      </form>
    </Card>
  );
}
