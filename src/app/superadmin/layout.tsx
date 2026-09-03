import { InactivityGuard } from "@/components/InactivityGuard";

export default function SuperadminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <InactivityGuard />
      {children}
    </>
  );
}
