import type { UseFormRegister, FieldError } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface SignupFormValues {
  email: string;
  username: string;
  password: string;
  confirm_password: string;
  first_name?: string;
  last_name?: string;
  timezone: string;
  date_of_birth: string;
  gender?: string;
  pronouns?: string;
  location?: string;
  real_name?: string;
}

interface IdentityErrors {
  timezone?: FieldError;
  date_of_birth?: FieldError;
  gender?: FieldError;
  pronouns?: FieldError;
  location?: FieldError;
  real_name?: FieldError;
}

interface Props {
  register: UseFormRegister<SignupFormValues>;
  errors: IdentityErrors;
}

const REQUIRED_MARK = <span className="text-accent">*</span>;
const ERROR_CLASS = "font-mono text-[12px] text-bad-ink";

export function SignupIdentityFields({ register, errors }: Props) {
  return (
    <>
      <div className="flex flex-col gap-2">
        <Label htmlFor="timezone">Timezone {REQUIRED_MARK}</Label>
        <Input
          id="timezone"
          type="text"
          readOnly
          className="font-mono text-[13px]"
          {...register("timezone")}
        />
        {errors.timezone && <p className={ERROR_CLASS}>{errors.timezone.message}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="date_of_birth">Date of birth {REQUIRED_MARK}</Label>
        <Input
          id="date_of_birth"
          type="date"
          className="font-mono text-[13px]"
          {...register("date_of_birth")}
        />
        {errors.date_of_birth && <p className={ERROR_CLASS}>{errors.date_of_birth.message}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="gender">Gender</Label>
        <Input
          id="gender"
          type="text"
          maxLength={64}
          placeholder="e.g. non-binary"
          {...register("gender")}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="pronouns">Pronouns</Label>
        <Input
          id="pronouns"
          type="text"
          maxLength={64}
          placeholder="e.g. they/them"
          {...register("pronouns")}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="location">Location</Label>
        <Input
          id="location"
          type="text"
          maxLength={120}
          placeholder="e.g. London, UK"
          {...register("location")}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="real_name">Real name</Label>
        <Input
          id="real_name"
          type="text"
          maxLength={200}
          placeholder="Your legal name (visible only to your goddess)"
          {...register("real_name")}
        />
      </div>
    </>
  );
}
