import { PageHeader } from "@/components/admin/PageHeader";
import { RestaurantForm } from "@/components/admin/RestaurantForm";

export const metadata = { title: "New restaurant" };

export default function NewRestaurantPage() {
  return (
    <>
      <PageHeader eyebrow="Clients" title="New restaurant" description="Start with the essentials. Brand, menu and films come next." />
      <RestaurantForm
        initial={{
          slug: "",
          name: {},
          default_language: "en",
          enabled_languages: ["en"],
          currency: "EUR",
          status: "draft",
        }}
      />
    </>
  );
}
