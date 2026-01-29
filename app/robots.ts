import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/dashboard",
        "/budgetallocation",
        "/reconcile",
        "/transactions",
        "/financial-position",
        "/settings",
        "/kids/",
        "/life/",
        "/onboarding",
        "/join-household",
      ],
    },
    sitemap: "https://www.mybudgetmate.co.nz/sitemap.xml",
  };
}
