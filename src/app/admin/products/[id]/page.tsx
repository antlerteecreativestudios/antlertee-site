import { notFound } from "next/navigation";
import { ProductEditor, type ProductOptions } from "@/components/admin/ProductEditor";
import { facts, SITE_URL } from "@/content/site";
import { requireAdminPage } from "@/server/auth/admin";
import { thumbResolver } from "@/server/admin-images";
import { FINISHES, FITS, getAdminProduct, SIZES } from "@/server/catalog";

const productOptions = (): ProductOptions => ({ fits: FITS, sizes: SIZES, finishes: FINISHES, defaultMoq: facts.moqLong, siteUrl: SITE_URL });

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { csrf } = await requireAdminPage();
  const { id } = await params;
  if (id === "new") return <ProductEditor product={null} photos={[]} csrf={csrf} options={productOptions()} />;
  const [product, thumb] = await Promise.all([getAdminProduct(id), thumbResolver()]);
  if (!product) notFound();
  const photos = [product.image, ...product.gallery].flatMap((s) => thumb(s) ?? []);
  return <ProductEditor product={product} photos={photos} csrf={csrf} options={productOptions()} />;
}
