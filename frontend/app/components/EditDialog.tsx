"use client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";
import EditForm from "./EditForm";
import { Sound } from "@/lib/sounds";

export default function EditDialog({sound}: {sound: Sound}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="w-full text-left" onClick={() => setOpen(true)}>
        Edit sound
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit sound</DialogTitle>
            <DialogDescription>
              Edit the name for this sound.
            </DialogDescription>
        </DialogHeader>
        <EditForm setOpen={setOpen} sound={sound} />
      </DialogContent>
    </Dialog>
  );
}
