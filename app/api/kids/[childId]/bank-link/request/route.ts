import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RouteContext {
  params: Promise<{ childId: string }>;
}

// POST /api/kids/[childId]/bank-link/request - Teen requests to link bank account
export async function POST(request: Request, context: RouteContext) {
  const supabase = await createClient();
  const { childId } = await context.params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get child profile and verify parent ownership
  const { data: child, error: childError } = await supabase
    .from("child_profiles")
    .select("id, parent_user_id, name, date_of_birth, min_age_for_bank_linking")
    .eq("id", childId)
    .eq("parent_user_id", user.id)
    .maybeSingle();

  if (childError || !child) {
    return NextResponse.json({ error: "Child not found" }, { status: 404 });
  }

  // Check age eligibility
  if (child.date_of_birth) {
    const age = Math.floor(
      (Date.now() - new Date(child.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    );
    const minAge = child.min_age_for_bank_linking || 13;

    if (age < minAge) {
      return NextResponse.json(
        {
          error: `${child.name} must be at least ${minAge} years old to link a bank account. Current age: ${age}`,
        },
        { status: 400 }
      );
    }
  }

  // Check for existing pending request
  const { data: existingRequest } = await supabase
    .from("teen_bank_link_requests")
    .select("id, request_status")
    .eq("child_profile_id", childId)
    .eq("request_status", "pending")
    .maybeSingle();

  if (existingRequest) {
    return NextResponse.json(
      { error: "A pending request already exists for this child" },
      { status: 400 }
    );
  }

  // Check for existing active connection
  const { data: existingConnection } = await supabase
    .from("teen_akahu_connections")
    .select("id, connection_status")
    .eq("child_profile_id", childId)
    .eq("connection_status", "active")
    .maybeSingle();

  if (existingConnection) {
    return NextResponse.json(
      { error: "This child already has an active bank connection" },
      { status: 400 }
    );
  }

  // Create the request
  const { data: linkRequest, error: createError } = await supabase
    .from("teen_bank_link_requests")
    .insert({
      child_profile_id: childId,
      parent_user_id: user.id,
      request_status: "pending",
    })
    .select()
    .single();

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 400 });
  }

  return NextResponse.json({
    request: linkRequest,
    message: `Bank linking request created for ${child.name}. Parent approval required.`,
  }, { status: 201 });
}

// GET /api/kids/[childId]/bank-link/request - Get pending requests
export async function GET(request: Request, context: RouteContext) {
  const supabase = await createClient();
  const { childId } = await context.params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify parent owns this child
  const { data: child } = await supabase
    .from("child_profiles")
    .select("id")
    .eq("id", childId)
    .eq("parent_user_id", user.id)
    .maybeSingle();

  if (!child) {
    return NextResponse.json({ error: "Child not found" }, { status: 404 });
  }

  // Get all requests for this child
  const { data: requests, error: requestsError } = await supabase
    .from("teen_bank_link_requests")
    .select("*")
    .eq("child_profile_id", childId)
    .order("created_at", { ascending: false });

  if (requestsError) {
    return NextResponse.json({ error: requestsError.message }, { status: 400 });
  }

  return NextResponse.json({ requests: requests || [] });
}
