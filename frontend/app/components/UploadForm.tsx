"use client";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { uploadSound } from "@/lib/sounds";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const maxFileSize = 1 * 1024 * 1024; // 1MB

const formSchema = z.object({
  displayname: z
    .string()
    .max(20, {
      message: "Name must be 20 characters or less",
    })
    .nonempty(),
  file: z
    .any()
    .refine((value) => value?.length === 1, {
      message: "Please select a file",
    })
    .refine(
      (value) => {
        const file = value?.[0];
        if (!file) return false;
        const allowedTypes = ["audio/mpeg", "audio/wav", "audio/ogg"];
        return allowedTypes.includes(file.type);
      },
      {
        message: "File must be of type mp3, wav, or ogg",
      }
    )
    .refine(
      (value) => {
        const file = value?.[0];
        if (!file) return false;
        return file.size <= maxFileSize;
      },
      {
        message: `File must be less than 1MB`,
      }
    )
});

export default function UploadForm({ setOpen }: { setOpen?: (open: boolean) => void }) {
  const router = useRouter();
  const session = useSession();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  const fileRef = form.register("file");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    if (typeof window === "undefined") return; // Ensure this code runs only on the client side
    if (!data.file) return;
    form.setValue("displayname", data.displayname.trim());
    const formData = new FormData();
    formData.append("displayname", data.displayname);
    formData.append("audio", data.file[0]);
    formData.append("uploadedBy", JSON.stringify({
      id: session.data?.user?.id,
      name: session.data?.user?.name,
    }));

    try {
      const response = await uploadSound(formData);
      if (response.ok) {
        form.reset();
        if (setOpen) setOpen(false);
        router.refresh();
      } else {
        const error = await response.json();
        console.error(`Error: ${error.message}`);
        setError(error.message);
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Error: ${error.message}`);
        setError(error.message);
      } else {
        console.error("Unknown error");
        setError("Unknown error");
      }
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        onChange={() => setError(null)}
        className="w-full space-y-2 flex flex-col"
      >
        <FormField
          control={form.control}
          name="displayname"
          render={({ field }) => {
            return (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input type="text" placeholder="Name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            );
          }}
        />
        <FormField
          control={form.control}
          name="file"
          render={() => {
            return (
              <FormItem>
                <FormLabel>File</FormLabel>
                <FormControl>
                  <Input
                    type="file"
                    accept=".mp3,.wav,.ogg"
                    {...fileRef}
                    onChange={
                      // set displayname to filename if displayname is empty
                      // use regex to remove file extension and replace underscores with spaces
                      (event) => {
                        const file = event.target.files?.[0];
                        if (file && !form.getValues("displayname")) {
                          form.setValue(
                            "displayname",
                            file.name
                              .replace(/\.[^/.]+$/, "")
                              .replace(/_/g, " ")
                              .slice(0, 20)
                          );
                        }
                        // revalidate form
                        form.trigger("displayname");
                      }
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            );
          }}
        />
        <Button type="submit" className="">
          Upload
        </Button>
        {error && <p className="text-red-500 text-sm">Error while uploading: {error}</p>}
      </form>
    </Form>
  );
}
