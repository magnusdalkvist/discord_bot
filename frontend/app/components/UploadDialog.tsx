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
        <Button className="dark:bg-[#3b3b3b] dark:text-foreground">Upload sound</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Upload sound</DialogTitle>
            <DialogDescription>
            Add a new sound to the soundboard. Ensure the file is in an audio format and under 1MB.
            </DialogDescription>
        </DialogHeader>
        <UploadForm setOpen={setOpen}/>
      </DialogContent>
    </Dialog>
  );
}
