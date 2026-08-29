import { CruzMalta } from "@/components/ui/cruz-malta";

export default function SectionDivider() {
  return (
    <div className="flex items-center gap-4">
      <div className="h-px flex-1 bg-[#1E1E1E]" />
      <CruzMalta size={10} color="#C00000" />
      <div className="h-px flex-1 bg-[#1E1E1E]" />
    </div>
  );
}
