// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MetricCard } from "@/components/dashboard/metric-card";

describe("Showcase: Component Tests -> MetricCard", () => {
  it("renders metric title, value, unit, and badge correctly", () => {
    render(
      <MetricCard
        title="Hydration Today"
        value={2250}
        unit="ml"
        statusText="75% of Goal"
        statusVariant="secondary"
        percentage={75}
      />
    );

    expect(screen.getByText("Hydration Today")).toBeDefined();
    expect(screen.getByText("2250")).toBeDefined();
    expect(screen.getByText("ml")).toBeDefined();
    expect(screen.getByText("75% of Goal")).toBeDefined();
    expect(screen.getByText("75%")).toBeDefined();
  });

  it("triggers action callback when quick-add button is clicked", () => {
    const handleAction = vi.fn();
    render(
      <MetricCard
        title="Water"
        value={1500}
        unit="ml"
        actionLabel="+250ml"
        onAction={handleAction}
      />
    );

    const actionButton = screen.getByRole("button", { name: "+250ml" });
    fireEvent.click(actionButton);
    expect(handleAction).toHaveBeenCalledTimes(1);
  });

  it("renders loading skeleton state when isLoading is true", () => {
    render(
      <MetricCard
        title="Calories"
        value={1800}
        isLoading={true}
      />
    );

    expect(screen.getByTestId("metric-card-loading")).toBeDefined();
    expect(screen.queryByText("Calories")).toBeNull();
  });
});
