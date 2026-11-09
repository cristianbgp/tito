import { useLocale } from "../i18n/react";
import { Link } from "react-router";
import { PageHeading } from "../components/shared";
import { Card } from "../components/ui/card";
import { copy } from "../i18n";
import {
  ArrowUpRightIcon,
  GridFourIcon,
  UserCircleIcon,
  ChartLineIcon,
  MagnifyingGlassIcon,
} from "../components/icons";
import { libraryCopy as library } from "../i18n/library";
import { intelligenceCopy as intelligence } from "../i18n/intelligence";
const tools = () => [
  {
    path: "hero-picker",
    title: copy.tools.heroPicker,
    description: copy.tools.heroPickerHelp,
    icon: GridFourIcon,
  },
  {
    path: "pools",
    title: library.poolsTitle,
    description: library.poolsDescription,
    icon: UserCircleIcon,
  },
  {
    path: "compare",
    title: copy.tools.compare,
    description: copy.tools.compareHelp,
    icon: ChartLineIcon,
  },
  {
    path: "reference",
    title: intelligence.reference.title,
    description: intelligence.reference.description,
    icon: MagnifyingGlassIcon,
  },
];
export function ToolsPage() {
  useLocale();
  return (
    <section className="tools-page">
      <PageHeading
        eyebrow={copy.tools.eyebrow}
        title={copy.tools.title}
        description={copy.tools.description}
      />
      <div className="tools-grid grid grid-cols-2 gap-4 max-[1000px]:grid-cols-1">
        {tools().map(({ path, title, description, icon: Icon }) => (
          <Card
            key={path}
            className="tool-card m-0 flex min-w-0 items-start gap-4 p-6 text-foreground max-[580px]:p-5 max-[580px]:[&_>_svg]:hidden"
            render={<Link to={`/tools/${path}`} />}
          >
            <span
              className={
                "tool-card-icon grid place-items-center w-11.5 h-11.5 border border-border bg-[var(--selected)] rounded-[18px] text-primary shrink-0 max-[580px]:w-10.5 max-[580px]:h-10.5 max-[580px]:rounded-[12px]"
              }
            >
              <Icon size={26} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-[23px] leading-[1.25] tracking-[-0.8px] max-[580px]:text-[21px]">
                {title}
              </h2>
              <p className="mt-3 text-[14px] leading-[1.6] text-muted-foreground">
                {description}
              </p>
            </div>
            <ArrowUpRightIcon size={22} aria-hidden="true" />
          </Card>
        ))}
      </div>
    </section>
  );
}
