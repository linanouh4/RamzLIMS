"use client";

import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";

type BackButtonProps = { href: string; replace?: boolean; onClick?: never } | { href?: never; onClick: () => void };

export default function BackButton(props: BackButtonProps) {
  const { language } = useLanguage();
  const arabic = language === "ar";
  const appearance = {
    dir: arabic ? "rtl" : "ltr",
    className: "inline-flex shrink-0 items-center gap-2 self-start rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-blue-700 print:hidden",
  };
  const content = <>
    <span aria-hidden="true">{arabic ? "→" : "←"}</span>
    <span>{arabic ? "رجوع" : "Back"}</span>
  </>;
  if (props.href !== undefined) return <Link href={props.href} replace={props.replace} {...appearance}>{content}</Link>;
  return <button type="button" onClick={props.onClick} {...appearance}>{content}</button>;
}
