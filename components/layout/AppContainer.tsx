import type { ReactNode } from "react";

import Background from "@/components/layout/Background";
import Glow from "@/components/layout/Glow";
import Stars from "@/components/layout/Stars";

type AppContainerProps = {
  children: ReactNode;
};

export default function AppContainer({
  children,
}: AppContainerProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050816] px-6 py-10 text-white">
      <Background />
      <Stars />

      <Glow className="left-1/2 top-[28%] h-[460px] w-[460px] -translate-x-1/2 -translate-y-1/2" />

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md items-center">
        <div className="flex w-full flex-col gap-8">
          {children}
        </div>
      </div>
    </main>
  );
}