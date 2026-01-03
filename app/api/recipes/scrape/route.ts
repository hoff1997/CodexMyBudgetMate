import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { scrapeRecipe } from "@/lib/utils/recipe-scraper";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { url } = body;

  if (!url) {
    return NextResponse.json({ error: "URL required" }, { status: 400 });
  }

  try {
    const scrapedData = await scrapeRecipe(url);

    if (!scrapedData.success) {
      return NextResponse.json(
        {
          error: "Could not scrape recipe. Please add manually.",
          scraped_data: scrapedData,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ scraped_data: scrapedData });
  } catch (error) {
    console.error("Scraping error:", error);
    return NextResponse.json(
      {
        error: "Scraping failed. Please add manually.",
      },
      { status: 500 }
    );
  }
}
