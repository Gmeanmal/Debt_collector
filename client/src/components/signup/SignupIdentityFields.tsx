import type { UseFormRegister, FieldError } from "react-hook-form";

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

const INPUT_CLASS =
  "bg-base-surface-raised border border-base-border rounded-md px-3 py-2 text-base-text placeholder:text-base-text-subtle focus:outline-none focus:ring-2 focus:ring-pink-primary";

const LABEL_CLASS = "text-sm font-medium text-base-text-muted";

export function SignupIdentityFields({ register, errors }: Props) {
  return (
    <>
      <div className="flex flex-col gap-1">
        <label htmlFor="timezone" className={LABEL_CLASS}>
          Timezone <span className="text-status-danger">*</span>
        </label>
        <input
          id="timezone"
          type="text"
          className={INPUT_CLASS}
          readOnly
          {...register("timezone")}
        />
        {errors.timezone && (
          <p className="text-sm text-status-danger">{errors.timezone.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="date_of_birth" className={LABEL_CLASS}>
          Date of birth <span className="text-status-danger">*</span>
        </label>
        <input
          id="date_of_birth"
          type="date"
          className={INPUT_CLASS}
          {...register("date_of_birth")}
        />
        {errors.date_of_birth && (
          <p className="text-sm text-status-danger">{errors.date_of_birth.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="gender" className={LABEL_CLASS}>
          Gender
        </label>
        <input
          id="gender"
          type="text"
          maxLength={64}
          placeholder="e.g. non-binary"
          className={INPUT_CLASS}
          {...register("gender")}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="pronouns" className={LABEL_CLASS}>
          Pronouns
        </label>
        <input
          id="pronouns"
          type="text"
          maxLength={64}
          placeholder="e.g. they/them"
          className={INPUT_CLASS}
          {...register("pronouns")}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="location" className={LABEL_CLASS}>
          Location
        </label>
        <input
          id="location"
          type="text"
          maxLength={120}
          placeholder="e.g. London, UK"
          className={INPUT_CLASS}
          {...register("location")}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="real_name" className={LABEL_CLASS}>
          Real name
        </label>
        <input
          id="real_name"
          type="text"
          maxLength={200}
          placeholder="Your legal name (visible only to your goddess)"
          className={INPUT_CLASS}
          {...register("real_name")}
        />
      </div>
    </>
  );
}
