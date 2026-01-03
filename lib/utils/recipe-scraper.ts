interface ScrapedRecipe {
  title: string;
  description?: string;
  ingredients?: string[];
  instructions?: string[];
  prep_time?: string;
  cook_time?: string;
  servings?: string;
  images: string[];
  method: "schema" | "opengraph" | "manual";
  success: boolean;
}

export async function scrapeRecipe(url: string): Promise<ScrapedRecipe> {
  try {
    const response = await fetch(url);
    const html = await response.text();

    // Try Schema.org structured data first
    const schemaRecipe = extractSchemaOrgRecipe(html);
    if (schemaRecipe.success) {
      return schemaRecipe;
    }

    // Fallback to Open Graph + image extraction
    return extractOpenGraphRecipe(html, url);
  } catch (error) {
    console.error("Recipe scraping failed:", error);
    return {
      title: "",
      images: [],
      method: "manual",
      success: false,
    };
  }
}

function extractSchemaOrgRecipe(html: string): ScrapedRecipe {
  try {
    // Find JSON-LD scripts
    const jsonLdRegex =
      /<script type="application\/ld\+json">(.*?)<\/script>/gs;
    const matches = html.matchAll(jsonLdRegex);

    for (const match of matches) {
      try {
        const data = JSON.parse(match[1]);

        // Handle arrays of objects
        const items = Array.isArray(data) ? data : [data];

        for (const item of items) {
          if (
            item["@type"] === "Recipe" ||
            item["@type"]?.includes("Recipe")
          ) {
            return {
              title: item.name || "",
              description: item.description || "",
              ingredients: Array.isArray(item.recipeIngredient)
                ? item.recipeIngredient
                : [],
              instructions: extractInstructions(item.recipeInstructions),
              prep_time: parseDuration(item.prepTime) || "",
              cook_time: parseDuration(item.cookTime) || "",
              servings: item.recipeYield?.toString() || "",
              images: extractImages(item.image),
              method: "schema",
              success: true,
            };
          }

          // Check for nested Recipe in @graph
          if (item["@graph"] && Array.isArray(item["@graph"])) {
            for (const graphItem of item["@graph"]) {
              if (
                graphItem["@type"] === "Recipe" ||
                graphItem["@type"]?.includes("Recipe")
              ) {
                return {
                  title: graphItem.name || "",
                  description: graphItem.description || "",
                  ingredients: Array.isArray(graphItem.recipeIngredient)
                    ? graphItem.recipeIngredient
                    : [],
                  instructions: extractInstructions(
                    graphItem.recipeInstructions
                  ),
                  prep_time: parseDuration(graphItem.prepTime) || "",
                  cook_time: parseDuration(graphItem.cookTime) || "",
                  servings: graphItem.recipeYield?.toString() || "",
                  images: extractImages(graphItem.image),
                  method: "schema",
                  success: true,
                };
              }
            }
          }
        }
      } catch {
        continue;
      }
    }
  } catch (error) {
    console.error("Schema.org extraction failed:", error);
  }

  return { title: "", images: [], method: "manual", success: false };
}

function parseDuration(duration: string | undefined): string {
  if (!duration) return "";

  // Parse ISO 8601 duration (e.g., PT30M, PT1H30M)
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (match) {
    const hours = match[1] ? parseInt(match[1]) : 0;
    const minutes = match[2] ? parseInt(match[2]) : 0;

    if (hours && minutes) {
      return `${hours}h ${minutes}m`;
    } else if (hours) {
      return `${hours}h`;
    } else if (minutes) {
      return `${minutes} min`;
    }
  }

  return duration;
}

function extractInstructions(instructions: unknown): string[] {
  if (!instructions) return [];

  if (typeof instructions === "string") {
    return [instructions];
  }

  if (Array.isArray(instructions)) {
    return instructions
      .map((inst) => {
        if (typeof inst === "string") return inst;
        if (inst.text) return inst.text;
        if (inst["@type"] === "HowToStep" && inst.text) return inst.text;
        if (inst["@type"] === "HowToSection" && inst.itemListElement) {
          return inst.itemListElement
            .map((step: { text?: string }) => step.text || "")
            .filter(Boolean)
            .join("\n");
        }
        return "";
      })
      .filter(Boolean);
  }

  return [];
}

function extractImages(imageData: unknown): string[] {
  if (!imageData) return [];

  if (typeof imageData === "string") {
    return [imageData];
  }

  if (Array.isArray(imageData)) {
    return imageData
      .map((img) => {
        if (typeof img === "string") return img;
        if (img.url) return img.url;
        return "";
      })
      .filter(Boolean);
  }

  if (typeof imageData === "object" && imageData !== null) {
    const img = imageData as { url?: string };
    if (img.url) {
      return [img.url];
    }
  }

  return [];
}

function extractOpenGraphRecipe(html: string, url: string): ScrapedRecipe {
  const title =
    extractMetaTag(html, "og:title") ||
    extractMetaTag(html, "twitter:title") ||
    extractTitleTag(html);
  const description =
    extractMetaTag(html, "og:description") ||
    extractMetaTag(html, "twitter:description");
  const ogImage =
    extractMetaTag(html, "og:image") || extractMetaTag(html, "twitter:image");

  const images: string[] = [];
  if (ogImage) images.push(ogImage);

  // Extract all images from page
  const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
  const imgMatches = html.matchAll(imgRegex);

  for (const match of imgMatches) {
    const src = match[1];
    if (
      src &&
      !src.includes("icon") &&
      !src.includes("logo") &&
      !src.includes("pixel") &&
      !src.includes("avatar")
    ) {
      try {
        const fullUrl = src.startsWith("http") ? src : new URL(src, url).href;
        if (!images.includes(fullUrl)) {
          images.push(fullUrl);
        }
      } catch {
        // Invalid URL, skip
      }
    }
  }

  return {
    title: title || "",
    description,
    images: images.slice(0, 10), // Limit to 10 images
    method: "opengraph",
    success: !!title,
  };
}

function extractMetaTag(html: string, property: string): string {
  // Try property attribute first
  const propertyRegex = new RegExp(
    `<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`,
    "i"
  );
  let match = html.match(propertyRegex);
  if (match) return match[1];

  // Try name attribute
  const nameRegex = new RegExp(
    `<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`,
    "i"
  );
  match = html.match(nameRegex);
  if (match) return match[1];

  // Try content first (some sites put content before property)
  const reverseRegex = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`,
    "i"
  );
  match = html.match(reverseRegex);
  return match ? match[1] : "";
}

function extractTitleTag(html: string): string {
  const match = html.match(/<title>([^<]+)<\/title>/i);
  return match ? match[1].trim() : "";
}
