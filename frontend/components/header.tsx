"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Header() {
  const pathname = usePathname();

  const navItems = [
    { href: "/donor", label: "Donors" },
    { href: "/streamer", label: "Streamers" },
    { href: "/distribute-yield", label: "Distribute Yield" },
    { href: "/manage-funds", label: "Manage Funds" },
  ];

  return (
    <header className="border-b border-zinc-800 bg-black">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-xl font-semibold text-white">
          Yield Donation
        </Link>
        <nav className="flex gap-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-4 py-2 transition-colors ${
                pathname === item.href
                  ? "bg-white text-black"
                  : "text-white hover:bg-zinc-800"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
