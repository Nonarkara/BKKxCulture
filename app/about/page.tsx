import type { Metadata } from "next";
import { PlaceMasthead } from "../PlaceMasthead";
import { AboutEssay } from "./AboutEssay";

export const metadata: Metadata = {
  title: "About",
  description:
    "Why this project exists: a personal essay on Bangkok's old town, World Heritage cities, and the case for a city that never got the plaque.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About · BKKxC(ulture)",
    description:
      "Why this project exists: a personal essay on Bangkok's old town, World Heritage cities, and the case for a city that never got the plaque.",
    url: "/about",
    images: [{ url: "/about/wat-arun-lasers.jpg" }],
  },
};

export default function AboutPage() {
  return (
    <div className="register">
      <PlaceMasthead />
      <article className="register-lede place-page">
        <AboutEssay />
      </article>
    </div>
  );
}
