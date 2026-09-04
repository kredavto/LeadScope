import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DataExplorer } from "./data-explorer";
import { WorkspaceProvider } from "./workspace-provider";

describe("DataExplorer", () => {
  it("filters rows by search query", () => {
    render(<WorkspaceProvider><DataExplorer sectionKey="competitors" section={{ title: "Test", eyebrow: "Test", description: "Test", action: "Add", columns: [{ key: "name", label: "Name" }, { key: "status", label: "Status" }], rows: [] }} /></WorkspaceProvider>);
    fireEvent.change(screen.getByLabelText("Поиск"), { target: { value: "Финанс" } });
    expect(screen.getByText("Финанс Авто")).toBeInTheDocument();
    expect(screen.queryByText("Пример Сервис")).not.toBeInTheDocument();
  });
});
