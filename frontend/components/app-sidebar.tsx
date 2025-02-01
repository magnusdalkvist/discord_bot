"use client";

import * as React from "react";
import { Volume2 } from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";

import { SessionProvider } from "next-auth/react";
import { TeamSwitcher } from "./team-switcher";
import { User } from "next-auth";
import { DiscordLogoIcon } from "@radix-ui/react-icons";

// This is sample data.
const data = {
  navMain: [
    {
      title: "Discord",
      url: "/discord",
      icon: DiscordLogoIcon,
      isActive: true,
      items: [
        {
          title: "Activity",
          url: "/discord/activity",
        },
      ],
    },
    {
      title: "Soundboard",
      url: "/soundboard",
      icon: Volume2,
      isActive: true,
      items: [
        {
          title: "Overview",
          url: "/soundboard",
        },
        {
          title: "Leaderboard",
          url: "/soundboard/leaderboard",
        },
        {
          title: "Favorites",
          url: "/soundboard/favorites",
        },
        {
          title: "My Uploads",
          url: "/soundboard/uploads",
        },
      ],
    },
  ],
};

export function AppSidebar({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: User | undefined;
}) {
  return (
    <SessionProvider>
      <Sidebar collapsible="icon" {...props}>
        <SidebarHeader>
          <TeamSwitcher />
        </SidebarHeader>
        <SidebarContent>
          <NavMain items={data.navMain} />
        </SidebarContent>
        <SidebarFooter>
          <NavUser user={user} />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
    </SessionProvider>
  );
}
