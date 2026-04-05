import Link from "next/link";
import { headers } from "next/headers";

export default async function SustainabilityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const pathname = headersList.get("x-invoke-path") || "";

  const tabs = [
    { name: "🌎 Impact Dashboard", href: "/sustainability/impact", match: "/impact" },
    { name: "⚡ Carbon Engine", href: "/sustainability/carbon", match: "/carbon" },
    { name: "📋 Compliance & GDPR", href: "/sustainability/compliance", match: "/compliance" },
  ];

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
          Sustainability & Compliance
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm font-medium">
          Environmental impact scoring, carbon calculations, and global regulatory compliance governance.
        </p>
      </div>

      <div className="border-b border-gray-200 dark:border-gray-800 mb-6 flex overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = pathname.includes(tab.match);
          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={`whitespace-nowrap px-6 py-3 font-bold text-sm border-b-2 transition-colors duration-200 ${
                isActive
                  ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
              }`}
            >
              {tab.name}
            </Link>
          );
        })}
      </div>

      <div className="bg-transparent rounded-xl">
        {children}
      </div>
    </div>
  );
}
