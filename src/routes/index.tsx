import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dr. Ananta Kumar Bhakta | Orthopedic & Spine Surgeon, Uttara, Dhaka" },
      { name: "description", content: "Dr. Ananta Kumar Bhakta - MBBS, BCS (Health), MS Orthopedics (NITOR). Orthopedic and spine surgeon in Uttara, Dhaka." },
      { property: "og:title", content: "Dr. Ananta Kumar Bhakta | Orthopedic & Spine Surgeon" },
      { property: "og:description", content: "Advanced orthopedic and spine care in Uttara, Dhaka." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <iframe
      title="Dr. Ananta Kumar Bhakta website"
      src="/site/index.html"
      className="block min-h-screen w-full border-0"
    />
  );
}
