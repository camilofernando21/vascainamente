import Link from "next/link";
import TextRoll from "@/components/ui/text-roll";
import { CruzMalta } from "@/components/ui/cruz-malta";
import { DiagonalStripes } from "@/components/ui/diagonal-stripes";
import { formatDateFull } from "@/lib/time";

export default function Header() {
  return (
    <header className="relative h-[50px] overflow-hidden border-b-2 border-red">
      <DiagonalStripes className="absolute inset-0" />
      <div className="relative flex h-full items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-[6px]">
          <span className="text-red text-[13px] font-medium">✕</span>
          <CruzMalta size={14} color="#C00000" />
          <TextRoll
            center
            className="text-[13px] font-medium tracking-[2px] text-[#fff]"
          >
            VASCAINAMENTE
          </TextRoll>
        </Link>
        <span className="text-[11px] text-text-muted">{formatDateFull(new Date().toISOString())}</span>
      </div>
    </header>
  );
}
