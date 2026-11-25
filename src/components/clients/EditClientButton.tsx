"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import type { ClientRecord } from "@/modules/clients/types";
import { CreateClientModal } from "./CreateClientModal";

interface EditClientButtonProps {
  client: ClientRecord;
}

export function EditClientButton({ client }: EditClientButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 rounded-full text-xs font-medium text-ink bg-white hover:bg-fog transition-colors border border-line"
      >
        <Pencil className="h-3.5 w-3.5" />
        <span>Edit Client</span>
      </button>

      <CreateClientModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        clientToEdit={client}
        onSuccess={() => {
          router.refresh();
        }}
      />
    </>
  );
}
