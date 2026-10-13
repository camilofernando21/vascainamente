import FacebookLink from "@/components/FacebookLink";
import InstagramLink from "@/components/InstagramLink";
import XLink from "@/components/XLink";
import { cn } from "@/lib/utils";

// The site's social profiles side by side: Instagram and X, and the Facebook page where there is room (the footer).
export default function SocialLinks({
  size = 20,
  showHandle = false,
  facebook = false,
  className,
}: {
  size?: number;
  showHandle?: boolean;
  facebook?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("vm-social", className)}>
      <InstagramLink size={size} showHandle={showHandle} />
      <XLink size={size} showHandle={showHandle} />
      {facebook && <FacebookLink size={size} showHandle={showHandle} />}
    </div>
  );
}
