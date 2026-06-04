import "server-only";
import { getSupabaseAdmin } from "../supabase/admin";
import { slugify } from "../slug";
import type { Product } from "../types";

export type MatchResult =
  | { kind: "found"; product: Product }
  | { kind: "none" }
  | { kind: "ambiguous"; products: Product[] };

/**
 * Match a free-text product reference from a WhatsApp command against the
 * active product catalog. Supports exact name, slug, and case-insensitive
 * matching. No fuzzy/AI matching (per spec).
 */
export async function matchProduct(text: string): Promise<MatchResult> {
  const supabase = getSupabaseAdmin();
  const needle = text.trim().toLowerCase();
  const needleSlug = slugify(text);

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true);

  if (error) throw error;
  const products = (data ?? []) as Product[];

  const matches = products.filter((p) => {
    return (
      p.name.toLowerCase() === needle ||
      p.slug === needle ||
      p.slug === needleSlug
    );
  });

  if (matches.length === 1) return { kind: "found", product: matches[0] };
  if (matches.length === 0) return { kind: "none" };
  return { kind: "ambiguous", products: matches };
}
