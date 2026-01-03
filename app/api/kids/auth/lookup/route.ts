import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isValidFamilyCodeFormat } from "@/lib/utils/family-code-generator";

// POST: Look up children by family access code (step 1 of kid login)
export async function POST(request: Request) {
  const supabase = await createClient();

  try {
    const body = await request.json();
    const { familyCode } = body;

    // Validate family code format
    if (!familyCode || !isValidFamilyCodeFormat(familyCode.toUpperCase())) {
      return NextResponse.json(
        { error: "Invalid family code format" },
        { status: 400 }
      );
    }

    // Find all children with this family code
    const { data: children, error } = await supabase
      .from("child_profiles")
      .select(
        `
        id,
        name,
        avatar_url
      `
      )
      .eq("family_access_code", familyCode.toUpperCase());

    if (error) {
      console.error("Error looking up family code:", error);
      return NextResponse.json(
        { error: "Failed to look up family code" },
        { status: 400 }
      );
    }

    if (!children || children.length === 0) {
      return NextResponse.json(
        { error: "No children found with this family code" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: children });
  } catch (err) {
    console.error("Error in POST /api/kids/auth/lookup:", err);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
