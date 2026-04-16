import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LimitForm } from "@/components/limits/LimitForm";
import { LimitsList } from "@/components/limits/LimitsList";
import { TriggerForm } from "@/components/limits/TriggerForm";
import { TriggersList } from "@/components/limits/TriggersList";
import {
  getLimits,
  addLimit,
  getTriggers,
  addTrigger,
  limitsKey,
  triggersKey,
  type LimitKind,
  type LimitSeverity,
} from "@/services/limits/limitsApi";
import { getSafeword, setSafeword, safewordKey } from "@/services/safeword/safewordApi";

const safewordFormSchema = z.object({
  word: z.string().min(1, "Safeword is required"),
  signal: z.string().optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
});

function SafewordSection() {
  const queryClient = useQueryClient();

  const { data: safeword } = useQuery({
    queryKey: [...safewordKey],
    queryFn: getSafeword,
    retry: false,
    throwOnError: false,
  });

  const [word, setWord] = useState(safeword?.word ?? "");
  const [signal, setSignal] = useState(safeword?.signal ?? "");
  const [contactName, setContactName] = useState(safeword?.emergency_contact_name ?? "");
  const [contactPhone, setContactPhone] = useState(safeword?.emergency_contact_phone ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const upsertMutation = useMutation({
    mutationFn: setSafeword,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...safewordKey] });
      toast.success("Safeword saved");
    },
    onError: () => toast.error("Failed to save safeword"),
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = safewordFormSchema.safeParse({
      word,
      signal,
      emergency_contact_name: contactName,
      emergency_contact_phone: contactPhone,
    });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string") fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    await upsertMutation.mutateAsync({
      word: result.data.word,
      signal: result.data.signal?.trim() || null,
      emergency_contact_name: result.data.emergency_contact_name?.trim() || null,
      emergency_contact_phone: result.data.emergency_contact_phone?.trim() || null,
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Safeword</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="safeword-word">Word</Label>
            <Input
              id="safeword-word"
              value={word}
              onChange={(e) => setWord(e.target.value)}
              placeholder="e.g. red"
            />
            {errors["word"] && <p className="text-xs text-status-danger">{errors["word"]}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="safeword-signal">Physical signal (optional)</Label>
            <Input
              id="safeword-signal"
              value={signal}
              onChange={(e) => setSignal(e.target.value)}
              placeholder="e.g. double-tap on the thigh"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="safeword-contact-name">Emergency contact name</Label>
              <Input
                id="safeword-contact-name"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Jane Doe"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="safeword-contact-phone">Emergency contact phone</Label>
              <Input
                id="safeword-contact-phone"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+44 7700 900000"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={upsertMutation.isPending}>
              {upsertMutation.isPending ? "Saving…" : "Save safeword"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function LimitsRoute() {
  const queryClient = useQueryClient();

  const { data: limits = [], isLoading: limitsLoading } = useQuery({
    queryKey: [...limitsKey],
    queryFn: getLimits,
  });

  const { data: triggers = [], isLoading: triggersLoading } = useQuery({
    queryKey: [...triggersKey],
    queryFn: getTriggers,
  });

  const addLimitMutation = useMutation({
    mutationFn: (vals: { kind: LimitKind; severity: LimitSeverity; label: string; notes: string | null }) =>
      addLimit(vals),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...limitsKey] });
      toast.success("Limit added");
    },
    onError: () => toast.error("Failed to add limit"),
  });

  const addTriggerMutation = useMutation({
    mutationFn: (vals: { severity: LimitSeverity; trigger_text: string; notes: string | null }) =>
      addTrigger(vals),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...triggersKey] });
      toast.success("Trigger added");
    },
    onError: () => toast.error("Failed to add trigger"),
  });

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-pink-primary tracking-wider">
            Limits &amp; Triggers
          </h1>
          <p className="text-sm text-base-text-muted mt-1">
            Your hard and soft limits, personal triggers, and safeword.
          </p>
        </div>

        <SafewordSection />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Limits</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <div className="border-b border-base-border/40 pb-5">
                <p className="text-xs text-base-text-muted mb-3 uppercase tracking-[0.08em]">
                  Add new limit
                </p>
                <LimitForm
                  onSubmit={async (vals) => {
                    await addLimitMutation.mutateAsync(vals);
                  }}
                  isPending={addLimitMutation.isPending}
                />
              </div>
              {limitsLoading ? (
                <p className="text-sm text-base-text-muted">Loading…</p>
              ) : (
                <LimitsList items={limits} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Triggers</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <div className="border-b border-base-border/40 pb-5">
                <p className="text-xs text-base-text-muted mb-3 uppercase tracking-[0.08em]">
                  Add new trigger
                </p>
                <TriggerForm
                  onSubmit={async (vals) => {
                    await addTriggerMutation.mutateAsync(vals);
                  }}
                  isPending={addTriggerMutation.isPending}
                />
              </div>
              {triggersLoading ? (
                <p className="text-sm text-base-text-muted">Loading…</p>
              ) : (
                <TriggersList items={triggers} />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
