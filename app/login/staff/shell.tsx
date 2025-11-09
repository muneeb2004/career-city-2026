import { ReactNode } from "react";

interface StaffAuthShellProps {
  children: ReactNode;
}

export function StaffAuthShell({ children }: StaffAuthShellProps) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-white px-6 py-16">
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-20"
        style={{
          backgroundImage: 'url("/CareerCityPromotionalMaterial.jpg")',
          filter: "blur(8px)",
        }}
      />
      <div className="absolute inset-0 bg-white/85 backdrop-blur-xl" />

      <div className="relative z-10 flex w-full max-w-xl justify-center">
        {children}
      </div>
    </main>
  );
}