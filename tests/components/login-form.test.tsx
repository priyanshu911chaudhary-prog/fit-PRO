// @vitest-environment happy-dom
import { describe, expect, it, vi, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { LoginFormCard } from "@/components/auth/login-form-card";

describe("Showcase: Component Tests -> LoginFormCard", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders email, password inputs and submit button", () => {
    const handleSubmit = vi.fn();
    const { container } = render(<LoginFormCard onSubmit={handleSubmit} />);

    expect(container.querySelector("#login-email")).not.toBeNull();
    expect(container.querySelector("#login-password")).not.toBeNull();
    expect(screen.getByRole("button", { name: /Sign In/i })).toBeDefined();
  });

  it("displays client-side validation error when submitting empty fields", async () => {
    const handleSubmit = vi.fn();
    render(<LoginFormCard onSubmit={handleSubmit} />);

    const submitBtn = screen.getByRole("button", { name: /Sign In/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      const alert = screen.getByRole("alert");
      expect(alert.textContent).toContain("Please enter both email and password.");
    });
    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it("submits valid credentials successfully", async () => {
    const handleSubmit = vi.fn();
    const { container } = render(<LoginFormCard onSubmit={handleSubmit} />);

    const emailInput = container.querySelector("#login-email") as HTMLInputElement;
    const passwordInput = container.querySelector("#login-password") as HTMLInputElement;
    const submitBtn = screen.getByRole("button", { name: /Sign In/i });

    fireEvent.change(emailInput, { target: { value: "athlete@fitpro.dev" } });
    fireEvent.change(passwordInput, { target: { value: "SecurePass123!" } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledTimes(1);
      expect(handleSubmit).toHaveBeenCalledWith({
        email: "athlete@fitpro.dev",
        password: "SecurePass123!",
      });
    });
  });

  it("displays external error message when passed via props", () => {
    render(
      <LoginFormCard
        onSubmit={vi.fn()}
        errorMessage="Invalid email or password credentials."
      />
    );

    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("Invalid email or password credentials.");
  });

  it("disables the submit button and displays loading state during submission", () => {
    render(<LoginFormCard onSubmit={vi.fn()} isLoading={true} />);

    const submitBtn = screen.getByRole("button", { name: /Signing In.../i }) as HTMLButtonElement;
    expect(submitBtn).toBeDefined();
    expect(submitBtn.disabled).toBe(true);
  });

  it("toggles password visibility when the eye button is clicked", () => {
    const { container } = render(<LoginFormCard onSubmit={vi.fn()} />);

    const passwordInput = container.querySelector("#login-password") as HTMLInputElement;
    expect(passwordInput.type).toBe("password");

    const toggleBtn = screen.getByTestId("toggle-password-btn");
    fireEvent.click(toggleBtn);
    expect(passwordInput.type).toBe("text");

    fireEvent.click(toggleBtn);
    expect(passwordInput.type).toBe("password");
  });
});
