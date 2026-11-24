// @vitest-environment happy-dom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TabbedAuthCard } from "@/features/auth/components/tabbed-auth-card";

const session = vi.hoisted(() => ({ login: vi.fn(), register: vi.fn(), isLoading: false }));
vi.mock("@/context/auth-context", () => ({ useAuth: () => session }));
vi.mock("@/features/auth/components/oauth-buttons", () => ({ OAuthButtons: () => null }));

afterEach(() => {
  cleanup();
  session.login.mockReset();
  session.isLoading = false;
});

describe("Sign-in form", () => {
  it("submits the email and password entered in the form", async () => {
    render(<TabbedAuthCard redirectTarget="/water" />);
    fireEvent.change(screen.getByLabelText("Email Address"), { target: { value: "runner@fitpro.test" } });
    fireEvent.change(screen.getByLabelText("Password", { exact: true }), { target: { value: "StrongPass123!" } });
    fireEvent.submit(screen.getByRole("button", { name: /^Sign in$/i }).closest("form")!);
    await waitFor(() => expect(session.login).toHaveBeenCalledWith({ email: "runner@fitpro.test", password: "StrongPass123!" }, "/water"));
  });

  it("shows validation errors before sending credentials", async () => {
    render(<TabbedAuthCard />);
    fireEvent.submit(screen.getByLabelText("Email Address").closest("form")!);
    expect((await screen.findByRole("alert")).textContent).toContain("Please enter both email and password.");
    expect(session.login).not.toHaveBeenCalled();
  });

  it("can show and hide the password", () => {
    render(<TabbedAuthCard />);
    const password = screen.getByLabelText("Password", { exact: true }) as HTMLInputElement;
    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(password.type).toBe("text");
    fireEvent.click(screen.getByRole("button", { name: "Hide password" }));
    expect(password.type).toBe("password");
  });
});
