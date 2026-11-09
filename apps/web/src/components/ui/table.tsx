import type { ComponentProps } from "react";
// Views own their scroll region, preserving sticky headers and keyboard focus.
function Table(props: ComponentProps<"table">) {
  return <table data-slot="table" {...props} />;
}
function TableHeader(props: ComponentProps<"thead">) {
  return <thead data-slot="table-header" {...props} />;
}
function TableBody(props: ComponentProps<"tbody">) {
  return <tbody data-slot="table-body" {...props} />;
}
function TableFooter(props: ComponentProps<"tfoot">) {
  return <tfoot data-slot="table-footer" {...props} />;
}
function TableRow(props: ComponentProps<"tr">) {
  return <tr data-slot="table-row" {...props} />;
}
function TableHead(props: ComponentProps<"th">) {
  return <th data-slot="table-head" {...props} />;
}
function TableCell(props: ComponentProps<"td">) {
  return <td data-slot="table-cell" {...props} />;
}
function TableCaption(props: ComponentProps<"caption">) {
  return <caption data-slot="table-caption" {...props} />;
}
export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
};
