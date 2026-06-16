"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// The front door. We give you a stable personal doc:
//  - if you've opened one before, go straight back to it
//  - otherwise mint a new id and remember it
// The id in the URL is your shareable link.
export default function Home() {
  const router = useRouter();
  useEffect(() => {
    let id = localStorage.getItem("wip:doc");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("wip:doc", id);
    }
    router.replace("/w/" + id);
  }, [router]);

  return <div className="wip"><div className="shell"><div className="center">Opening your WIP…</div></div></div>;
}
