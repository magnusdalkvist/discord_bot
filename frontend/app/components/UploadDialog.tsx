"use client";
import UploadForm from "./UploadForm";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function UploadDialog() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Upload sound</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Upload sound</DialogTitle>
          <DialogDescription>
            Upload a sound to the soundboard. Sounds must be in an audio format and less than 1.5MB.
          </DialogDescription>
        </DialogHeader>
        <UploadForm setOpen={setOpen}/>
      </DialogContent>
    </Dialog>
  );
}
