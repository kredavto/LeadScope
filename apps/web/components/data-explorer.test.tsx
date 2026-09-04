import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DataExplorer } from "./data-explorer";

describe("DataExplorer", () => {
  it("filters rows by search query", () => {
    render(<DataExplorer section={{ title: "Test", eyebrow: "Test", description: "Test", action: "Add", columns: [{ key: "name", label: "Name" }, { key: "status", label: "Status" }], rows: [{ name: "Alpha", status: "APPROVED" }, { name: "Beta", status: "BLOCKED" }] }} />);
    fireEvent.change(screen.getByLabelText("Поиск"), { target: { value: "Beta" } });
    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(screen.queryByText("Alpha")).not.toBeInTheDocument();
  });
});

