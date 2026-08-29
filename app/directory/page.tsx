"use client";

import { SiteHeader, GovFooter } from "@/components/chrome";
import { DirectoryView } from "@/components/directory-view";

export default function DirectoryPage() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="wrap stack gap-5" style={{ paddingTop: 24, paddingBottom: 40 }}>
        <DirectoryView />
      </main>
      <GovFooter />
    </>
  );
}
