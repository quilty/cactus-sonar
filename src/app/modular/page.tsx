"use client";

import { ModularRack } from "@/components/modular/ModularRack";
import { SideNav } from "@/components/synth/SideNav";

export default function ModularPage() {
  return (
    <>
      <SideNav poly={false} onPolyChange={() => {}} />
      <ModularRack />
    </>
  );
}
