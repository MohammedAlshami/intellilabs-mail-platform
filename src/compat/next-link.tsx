import Link from "next/link";
import type { ReactNode } from "react";

interface NextLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  replace?: boolean;
  scroll?: boolean;
}

export default function NextLink({ href, children, className, replace, scroll }: NextLinkProps) {
  return (
    <Link href={href} className={className} replace={replace} scroll={scroll}>
      {children}
    </Link>
  );
}
