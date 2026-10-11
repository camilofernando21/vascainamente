import { CruzMalta } from "@/components/ui/cruz-malta";

// Cover made by the site for an article that came without a photo: the category in big type, a red glow
// and the Maltese cross. Never a photo from another outlet, always the site's own look. Fills its parent.
export default function NewsCover({ label }: { label: string }) {
  return (
    <div className="vm-cover" aria-hidden="true">
      <CruzMalta size="100%" color="#F0EBE1" opacity={0.045} className="vm-cover-cross" />
      <span className="vm-cover-word">{label.toLowerCase()}</span>
    </div>
  );
}
