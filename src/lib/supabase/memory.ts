import { createClient } from "@/lib/supabase/client";

export async function saveMemory(memory: string) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User is not logged in.");
  }

  const { error } = await supabase.from("memories").insert({
    user_id: user.id,
    memory,
  });

  if (error) {
    throw error;
  }
}

export async function getMemories() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("memories")
    .select("id, memory, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function deleteMemory(id: string) {
  const supabase = createClient();

  const { error } = await supabase
    .from("memories")
    .delete()
    .eq("id", id);

  if (error) {
    throw error;
  }
}