import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Team - ACRM",
    description: "Meet the ACRM development team behind AI Carbon-Resilience Management.",
};

export default function TeamLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
