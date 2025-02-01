import { auth } from "@/auth";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Exclude specific paths
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/static/") ||
    pathname.startsWith("/_next/image/") ||
    pathname === "/favicon.ico" ||
    pathname.match(/\.(png|jpg|jpeg|gif|svg)$/)
  ) {
    return;
  }

  const allowedPaths = ["/"];
  // const allowedGuilds = ["476435508638253056"]
  // const guild = !req?.auth?.user?.guilds ? req?.auth?.user?.guilds?.find((guild: {id: string}) => allowedGuilds.includes(guild.id)) : [];
 
  if ((!req.auth && !allowedPaths.includes(pathname))) {
    const newUrl = new URL("/", req.nextUrl.origin);
    newUrl.searchParams.set("redirected", "unauth");
    return Response.redirect(newUrl);
  }

  // if (req.auth && !guild && !allowedPaths.includes(pathname)) {
  //   const newUrl = new URL("/", req.nextUrl.origin);
  //   newUrl.searchParams.set("redirected", "unauth-guild");
  //   return Response.redirect(newUrl);
  // }
});

export const config = {
  matcher: "/:path*",
};
