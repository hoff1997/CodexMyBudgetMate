import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createErrorResponse, createUnauthorizedError } from "@/lib/utils/api-error";

interface RouteParams {
  params: { id: string };
}

export async function GET(request: Request, { params }: RouteParams) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  const { data, error } = await supabase
    .from("recipes")
    .select("*")
    .eq("id", params.id)
    .eq("parent_user_id", user.id)
    .single();

  if (error) {
    return createErrorResponse(error, 400, "Failed to fetch recipe");
  }

  return NextResponse.json({ recipe: data });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  const body = await request.json();

  const { data, error } = await supabase
    .from("recipes")
    .update(body)
    .eq("id", params.id)
    .eq("parent_user_id", user.id)
    .select()
    .single();

  if (error) {
    return createErrorResponse(error, 400, "Failed to update recipe");
  }

  return NextResponse.json({ recipe: data });
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  const { error } = await supabase
    .from("recipes")
    .delete()
    .eq("id", params.id)
    .eq("parent_user_id", user.id);

  if (error) {
    return createErrorResponse(error, 400, "Failed to delete recipe");
  }

  return NextResponse.json({ success: true });
}
