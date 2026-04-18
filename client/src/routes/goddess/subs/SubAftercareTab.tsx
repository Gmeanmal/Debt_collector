import { SubAftercarePanel } from "@/components/goddess/SubAftercarePanel";

interface Props {
  username: string;
}

export function SubAftercareTab({ username }: Props) {
  return (
    <div className="pt-4">
      <SubAftercarePanel username={username} />
    </div>
  );
}
