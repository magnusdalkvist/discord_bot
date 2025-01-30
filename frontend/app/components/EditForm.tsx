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
import { editSound } from "@/lib/sounds";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Sound } from "../page";

const formSchema = z.object({
  displayname: z
    .string()
    .max(20, {
      message: "Name must be 20 characters or less",
    })
    .nonempty(),
});

export default function EditForm({
  setOpen,
  sound,
}: {
  setOpen?: (open: boolean) => void;
  sound: Sound;
}) {
  const router = useRouter();
  const session = useSession();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    if (typeof window === "undefined") return; // Ensure this code runs only on the client side
    if (!session.data?.user?.id) return;
    form.setValue("displayname", data.displayname.trim());
    const formData = new FormData();
    formData.append("displayname", data.displayname);
    formData.append("userId", session.data?.user?.id.toString());

    try {
      const response = await editSound(sound.filename, formData);
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
                  <Input
                    type="text"
                    placeholder={sound.displayname}
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      setError(null);
                    }}
                    onKeyDown={(e) => e.stopPropagation()}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            );
          }}
        />
        <Button type="submit" className="">
          Save changes
        </Button>
        {error && <p className="text-red-500 text-sm">Error while editing: {error}</p>}
      </form>
    </Form>
  );
}