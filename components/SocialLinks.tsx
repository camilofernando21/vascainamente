import InstagramLink from "@/components/InstagramLink";
import XLink from "@/components/XLink";
import { cn } from "@/lib/utils";

// The site's social profiles side by side: Instagram and X.
export default function SocialLinks({
  size = 20,
  showHandle = false,
  className,
}: {
  size?: number;
  showHandle?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("vm-social", className)}>
      <InstagramLink size={size} showHandle={showHandle} />
      <XLink size={size} showHandle={showHandle} />
    </div>
  );
}
