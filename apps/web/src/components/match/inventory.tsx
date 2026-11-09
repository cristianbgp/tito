import { useLocale } from "../../i18n/react";
import type { ItemSlot, MatchPlayer } from "../../api/generated/models";
import { unavailable, copy } from "../../i18n";
import { AssetImage } from "./asset-image";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "../ui/collapsible";

function itemName(item: ItemSlot) {
  return item.id == null
    ? copy.match.unavailableSlot
    : item.id === 0
      ? copy.match.emptySlot
      : item.name || copy.match.unknownItem(item.id);
}

function Slot({ item }: { item: ItemSlot }) {
  useLocale();
  const label = itemName(item);
  return (
    <span
      className={`item-slot block w-8.5 h-6.25 border border-border rounded-[4px] overflow-hidden [&_.asset-image]:w-full [&_.asset-image]:h-full ${item.id === 0 ? "empty-slot [&_.asset-image]:bg-[var(--input)] [&_.asset-image]:text-muted-foreground" : ""}`}
      role="img"
      aria-label={label}
      title={label}
    >
      <AssetImage
        src={item.image}
        fallback={item.id == null ? unavailable : item.id === 0 ? "·" : "?"}
      />
    </span>
  );
}

export function Inventory({ player }: { player: MatchPlayer }) {
  useLocale();
  const groups = [
    { name: copy.match.inventory, items: player.inventory },
    { name: copy.match.backpack, items: player.backpack },
    { name: copy.match.neutral, items: [player.neutralItem] },
    { name: copy.match.enhancement, items: [player.neutralEnhancement] },
  ];
  return (
    <div className={"inventory-cell w-56"}>
      <div
        className={"inventory-slots flex gap-0.75"}
        role="group"
        aria-label={copy.match.inventory}
      >
        {player.inventory.map((item, i) => (
          <Slot item={item} key={i} />
        ))}
      </div>
      <div className={"inventory-secondary flex justify-between gap-3.5 mt-1"}>
        <div
          className={
            "backpack-slots flex gap-0.75 [&_.item-slot]:opacity-[0.8]"
          }
          role="group"
          aria-label={copy.match.backpack}
        >
          {player.backpack.map((item, i) => (
            <Slot item={item} key={i} />
          ))}
        </div>
        <div
          className={
            "neutral-slots flex gap-0.75 [&_.item-slot]:[border-color:var(--gold)]"
          }
          role="group"
          aria-label={`${copy.match.neutral} / ${copy.match.enhancement}`}
        >
          <Slot item={player.neutralItem} />
          <Slot item={player.neutralEnhancement} />
        </div>
      </div>
      <Collapsible className="item-names mt-2 [&_[data-slot=collapsible-trigger]]:cursor-pointer [&_[data-slot=collapsible-trigger]]:py-1.5 [&_[data-slot=collapsible-trigger]]:px-0 [&_[data-slot=collapsible-trigger]]:text-muted-foreground [&_[data-slot=collapsible-trigger]]:text-[11px]">
        <CollapsibleTrigger>{copy.match.itemNames}</CollapsibleTrigger>
        <CollapsibleContent keepMounted>
          {groups.map((group) => (
            <div
              className="item-name-group my-2.5 mx-0 text-[11px] leading-[1.6] whitespace-normal [&_strong]:text-foreground [&_strong]:text-[11px] [&_ul]:mt-1 [&_ul]:mx-0 [&_ul]:mb-0 [&_ul]:pl-3.75"
              key={group.name}
            >
              <strong>{group.name}</strong>
              <ul>
                {group.items.map((item, i) => (
                  <li key={i}>
                    {group.items.length > 1
                      ? `${copy.match.slotLabel(i + 1)}: `
                      : ""}
                    {itemName(item)}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
