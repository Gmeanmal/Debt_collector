import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MedicalConsentGate } from "@/components/medical/MedicalConsentGate";
import {
  saveOwnMedical,
  medicalKey,
  type SubMedicalSelfOut,
  type SubMedicalUpdate,
} from "@/services/medical/medicalApi";
import { ConsentRequiredError } from "@/api/medical";

interface MedicalEditFormProps {
  current: SubMedicalSelfOut;
}

interface ConsentState {
  bodyMd: string;
  consentTextId: string;
}

function FieldLabel({ label, isSet }: { label: string; isSet: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <Label className="text-sm text-base-text">{label}</Label>
      {isSet ? (
        <Badge variant="success">Set</Badge>
      ) : (
        <Badge variant="default">Not set</Badge>
      )}
    </div>
  );
}

export function MedicalEditForm({ current }: MedicalEditFormProps) {
  const queryClient = useQueryClient();

  const [bloodType, setBloodType] = useState("");
  const [allergies, setAllergies] = useState("");
  const [medications, setMedications] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [medicalNotes, setMedicalNotes] = useState("");
  const [consentState, setConsentState] = useState<ConsentState | null>(null);
  const [pendingBody, setPendingBody] = useState<SubMedicalUpdate | null>(null);

  const mutation = useMutation({
    mutationFn: saveOwnMedical,
    onSuccess: (updated) => {
      queryClient.setQueryData(medicalKey.own(), updated);
      toast.success("Medical information saved.");
      setBloodType("");
      setAllergies("");
      setMedications("");
      setEmergencyContact("");
      setMedicalNotes("");
    },
    onError: (err) => {
      if (err instanceof ConsentRequiredError) {
        setPendingBody({
          blood_type: bloodType,
          allergies,
          medications,
          emergency_contact: emergencyContact,
          medical_notes: medicalNotes,
        });
        setConsentState({
          bodyMd: err.detail.bodyMd,
          consentTextId: err.detail.consentTextId,
        });
        return;
      }
      toast.error("Failed to save medical information. Please try again.");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate({
      blood_type: bloodType,
      allergies,
      medications,
      emergency_contact: emergencyContact,
      medical_notes: medicalNotes,
    });
  }

  function handleConsentAccepted() {
    setConsentState(null);
    if (pendingBody) {
      mutation.mutate(pendingBody);
      setPendingBody(null);
    }
  }

  if (consentState) {
    return (
      <MedicalConsentGate
        bodyMd={consentState.bodyMd}
        consentTextId={consentState.consentTextId}
        onAccepted={handleConsentAccepted}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Medical information</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-base-text-muted mb-4">
          Your information is encrypted and visible only to your goddess when medically necessary.
          Leave a field blank to clear it.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <FieldLabel label="Blood type" isSet={current.blood_type_is_set} />
            <textarea
              id="blood-type"
              aria-label="Blood type"
              className="min-h-[64px] w-full rounded-md border border-base-border bg-base-surface-raised px-3 py-2 text-sm text-base-text placeholder:text-base-text-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-primary resize-y"
              value={bloodType}
              onChange={(e) => setBloodType(e.target.value)}
              placeholder={current.blood_type_is_set ? "Enter new value to replace…" : "e.g. A+"}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <FieldLabel label="Allergies" isSet={current.allergies_is_set} />
            <textarea
              id="allergies"
              aria-label="Allergies"
              className="min-h-[80px] w-full rounded-md border border-base-border bg-base-surface-raised px-3 py-2 text-sm text-base-text placeholder:text-base-text-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-primary resize-y"
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              placeholder={current.allergies_is_set ? "Enter new value to replace…" : "Known allergies…"}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <FieldLabel label="Medications" isSet={current.medications_is_set} />
            <textarea
              id="medications"
              aria-label="Medications"
              className="min-h-[80px] w-full rounded-md border border-base-border bg-base-surface-raised px-3 py-2 text-sm text-base-text placeholder:text-base-text-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-primary resize-y"
              value={medications}
              onChange={(e) => setMedications(e.target.value)}
              placeholder={current.medications_is_set ? "Enter new value to replace…" : "Current medications…"}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <FieldLabel label="Emergency contact" isSet={current.emergency_contact_is_set} />
            <textarea
              id="emergency-contact"
              aria-label="Emergency contact"
              className="min-h-[64px] w-full rounded-md border border-base-border bg-base-surface-raised px-3 py-2 text-sm text-base-text placeholder:text-base-text-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-primary resize-y"
              value={emergencyContact}
              onChange={(e) => setEmergencyContact(e.target.value)}
              placeholder={current.emergency_contact_is_set ? "Enter new value to replace…" : "Name, phone number…"}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <FieldLabel label="Additional notes" isSet={current.medical_notes_is_set} />
            <textarea
              id="medical-notes"
              aria-label="Additional medical notes"
              className="min-h-[96px] w-full rounded-md border border-base-border bg-base-surface-raised px-3 py-2 text-sm text-base-text placeholder:text-base-text-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-primary resize-y"
              value={medicalNotes}
              onChange={(e) => setMedicalNotes(e.target.value)}
              placeholder={current.medical_notes_is_set ? "Enter new value to replace…" : "Any other relevant medical information…"}
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" variant="primary" size="md" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
