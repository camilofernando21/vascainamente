import Link from "next/link";
import InstagramLink from "@/components/InstagramLink";

// Top bar for inner pages: logo lockup back to the home.
export default function SiteTopBar() {
  return (
    <header className="vm-topbar">
      <Link href="/" className="vm-topbar-brand" aria-label="Vascainamente, página inicial">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/logo-vasco.png" alt="" className="h-9 w-auto lg:h-11" />
        <span>Vascainamente</span>
      </Link>
      <InstagramLink />
    </header>
  );
}
